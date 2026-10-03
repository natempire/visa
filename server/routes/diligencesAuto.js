const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { authentifier } = require('./auth');
const { requireRole } = require('../utils/requireRole');
const { verifierAccesDossier } = require('../utils/dossierAccess');
const { queryOne } = require('../db');
const { resolveDir, listFiles } = require('./fichiers');
const { construireBlocsDocuments } = require('../utils/documentExtraction');
const { soldesOuvertureCloture } = require('../utils/diligencesChecks');
const { CYCLES_DILIGENCES } = require('../../src/utils/diligencesData');

const router = express.Router();
const anthropic = new Anthropic();

const VERIFICATEURS_NUMERIQUES = { soldesOuvertureCloture };

// Modèle utilisé pour l'analyse des diligences, et ses tarifs (USD par million de tokens)
// pour pouvoir chiffrer le coût réel de chaque analyse. À mettre à jour si le modèle change.
const MODELE_IA = 'claude-sonnet-5';
const TARIFS_USD_PAR_MTOK = { input: 2.0, output: 10.0, cacheRead: 0.2, cacheWrite: 2.5 };

function calculerCoutUSD(usage) {
  if (!usage) return 0;
  const { input, output, cacheRead, cacheWrite } = TARIFS_USD_PAR_MTOK;
  return (
    (usage.inputTokens || 0) * input +
    (usage.outputTokens || 0) * output +
    (usage.cacheReadTokens || 0) * cacheRead +
    (usage.cacheWriteTokens || 0) * cacheWrite
  ) / 1_000_000;
}

// "Documents de l'entité" et "Documents du cycle" (dans le module Diligences) calculent
// chacun leur propre nom de dossier à partir du libellé du cycle, avec des règles de
// nettoyage légèrement différentes (apostrophes/points conservés ou non) — donc deux
// dossiers différents peuvent contenir des fichiers pour le même cycle. On regarde les deux.
function contextesPossibles(label) {
  return [
    `diligences/${label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_À-ɏ]/g, '').replace(/_+/g, '_')}`,
    `diligences/${label.replace(/\s+/g, '_').replace(/[()/,]/g, '').replace(/_+/g, '_')}`,
  ];
}

function fichiersDuCycle(dossierId, cycleLabel) {
  const contextes = [...new Set(contextesPossibles(cycleLabel))];
  const vus = new Set();
  const fichiers = [];
  for (const contexte of contextes) {
    const dir = resolveDir(dossierId, contexte);
    for (const f of listFiles(dir)) {
      if (vus.has(f.id)) continue;
      vus.add(f.id);
      fichiers.push({ nom: f.nom, chemin: path.join(dir, f.id) });
    }
  }
  return fichiers;
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str || '{}'); } catch { return fallback; }
}

// Calcule les propositions numériques (gratuites, sans appel IA) pour tous les cycles non
// supervisés d'un dossier. Partagé entre la route "numérique seulement" et l'analyse complète.
function calculerPropositionsNumeriques(dossierId, cyclesReponses) {
  const propositions = [];
  for (const cycle of CYCLES_DILIGENCES) {
    if (cyclesReponses[cycle.id]?.supervise) continue; // cycle verrouillé, on ne touche pas

    const pointsNumeriques = cycle.points.filter(p => p.automatisation?.type === 'numeric');
    if (pointsNumeriques.length === 0) continue;

    const fichiers = fichiersDuCycle(dossierId, cycle.label);
    const fichiersExcel = fichiers.filter(f => /\.(xlsx|xls)$/i.test(f.nom));
    for (const p of pointsNumeriques) {
      const verificateur = VERIFICATEURS_NUMERIQUES[p.automatisation.check];
      const resultat = verificateur
        ? verificateur(fichiersExcel)
        : { statut: null, justification: 'Vérificateur non implémenté.' };
      propositions.push({ pointId: p.id, cycleId: cycle.id, statut: resultat.statut, justification: resultat.justification, source: 'numeric' });
    }
  }
  return propositions;
}

// L'API Anthropic refuse une requête au-delà d'une certaine taille ("request_too_large") —
// avec beaucoup de cycles et de PDF scannés en une seule fois, tout regrouper dans UN appel
// peut dépasser cette limite. On vise toujours un seul appel, mais on répartit automatiquement
// en plusieurs lots (le moins possible) dès que le volume l'exige, plutôt que d'échouer.
const MAX_OCTETS_PAR_LOT = 25 * 1024 * 1024; // marge sous la limite de l'API (~32 Mo)
const MAX_DOCUMENTS_PAR_LOT = 40; // sécurité supplémentaire sur le nombre de pièces jointes

const SYSTEM_PROMPT_DILIGENCES = `Tu es un expert-comptable senior spécialisé en audit SYSCOHADA (zone OHADA). On te fournit, pour un même dossier client, un ou plusieurs cycles de diligences les uns après les autres, chacun introduit par "=== Cycle : <nom> ===". Les documents qui suivent immédiatement un en-tête de cycle appartiennent UNIQUEMENT à ce cycle — ne mélange jamais les documents ou les conclusions d'un cycle avec les points d'un autre cycle.

Pour chaque point de contrôle de chaque cycle, réponds "oui", "non" ou "na" (non applicable / information absente des documents fournis), avec une justification factuelle citant précisément ce que tu as trouvé ou n'as pas trouvé dans les documents de CE cycle — 1 à 2 phrases maximum, même quand plusieurs cycles sont fournis en même temps. Si un cycle n'a aucun document fourni, réponds "na" pour tous ses points en le précisant. Ne déduis et n'invente jamais une information qui n'est pas explicitement présente dans les documents fournis.

Réponds UNIQUEMENT avec un tableau JSON valide couvrant TOUS les points de TOUS les cycles fournis, sans texte avant ni après, au format exact :
[{"id": "...", "statut": "oui"|"non"|"na", "justification": "..."}]`;

function tailleBloc(bloc) {
  if (bloc.type === 'text') return bloc.text.length;
  if (bloc.source?.data) return bloc.source.data.length; // base64, proportionnel aux octets réels
  return 0;
}

// Construit le contenu (texte + documents) de chaque section indépendamment de l'appel IA,
// pour pouvoir estimer sa taille avant de décider dans quel lot elle va.
async function construireSections(dossierId, sections) {
  const preparees = [];
  for (const { cycle, points } of sections) {
    const fichiers = fichiersDuCycle(dossierId, cycle.label);
    const { blocs, ignores } = await construireBlocsDocuments(fichiers);
    const contenu = [{ type: 'text', text: `\n=== Cycle : ${cycle.label} ===` }];
    let nbDocuments = 0;
    if (blocs.length > 0) {
      contenu.push(...blocs);
      nbDocuments = blocs.filter(b => b.type === 'document' || b.type === 'image').length;
    } else {
      const note = ignores.length > 0
        ? `(Aucun document exploitable pour ce cycle — formats non pris en charge : ${ignores.join(', ')})`
        : '(Aucun document fourni pour ce cycle)';
      contenu.push({ type: 'text', text: note });
    }
    const listePoints = points.map(p => `- id "${p.id}" : ${p.texte}`).join('\n');
    contenu.push({ type: 'text', text: `Points de contrôle à vérifier pour ce cycle :\n${listePoints}` });

    const taille = contenu.reduce((somme, b) => somme + tailleBloc(b), 0);
    preparees.push({ cycle, points, contenu, taille, nbDocuments });
  }
  return preparees;
}

// Regroupement glouton : on remplit un lot jusqu'à ce que la section suivante le ferait
// dépasser une des deux limites, auquel cas on démarre un nouveau lot. Une section à elle
// seule dépassant la limite part quand même dans son propre lot (cas limite laissé tel quel).
function regrouperEnLots(sectionsPreparees) {
  const lots = [];
  let lot = [];
  let octets = 0;
  let documents = 0;
  for (const section of sectionsPreparees) {
    const depassementTaille = lot.length > 0 && octets + section.taille > MAX_OCTETS_PAR_LOT;
    const depassementDocs = lot.length > 0 && documents + section.nbDocuments > MAX_DOCUMENTS_PAR_LOT;
    if (depassementTaille || depassementDocs) {
      lots.push(lot);
      lot = [];
      octets = 0;
      documents = 0;
    }
    lot.push(section);
    octets += section.taille;
    documents += section.nbDocuments;
  }
  if (lot.length > 0) lots.push(lot);
  return lots;
}

async function analyserUnLot(lot) {
  const contenu = lot.flatMap(s => s.contenu);
  const nbPoints = lot.reduce((somme, s) => somme + s.points.length, 0);
  // Une justification courte tient sur ~150-200 tokens ; on prévoit large pour ne pas tronquer
  // le JSON en plein milieu quand un lot regroupe beaucoup de points (plusieurs cycles).
  const maxTokens = Math.min(16000, 2000 + nbPoints * 400);
  const message = await anthropic.messages.create({
    model: MODELE_IA,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT_DILIGENCES,
    messages: [{ role: 'user', content: contenu }],
  });

  const usage = {
    inputTokens: message.usage.input_tokens || 0,
    outputTokens: message.usage.output_tokens || 0,
    cacheReadTokens: message.usage.cache_read_input_tokens || 0,
    cacheWriteTokens: message.usage.cache_creation_input_tokens || 0,
  };

  const texte = message.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  const jsonMatch = texte.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    const err = new Error("Réponse de l'IA illisible (JSON non trouvé)");
    err.usage = usage; // l'appel a été facturé même si la réponse est inexploitable
    throw err;
  }
  const resultats = JSON.parse(jsonMatch[0]);

  const propositions = lot.flatMap(({ cycle, points }) =>
    points.map(p => {
      const r = resultats.find(x => x.id === p.id);
      return r
        ? { pointId: p.id, cycleId: cycle.id, statut: r.statut, justification: r.justification, source: 'ia' }
        : { pointId: p.id, cycleId: cycle.id, statut: null, justification: "L'IA n'a pas retourné de réponse pour ce point.", source: null };
    })
  );
  return { propositions, usage };
}

// Analyse tous les cycles narratifs demandés en visant un seul appel IA ; ne répartit en
// plusieurs lots que si le volume de documents l'exige (voir MAX_OCTETS_PAR_LOT ci-dessus).
// Un lot qui échoue (erreur API, JSON illisible...) n'empêche pas les autres de réussir.
// Retourne aussi la consommation réelle de tokens cumulée sur tous les lots.
async function analyserToutesLesSections(dossierId, sections) {
  const sectionsPreparees = await construireSections(dossierId, sections);
  const lots = regrouperEnLots(sectionsPreparees);
  const propositions = [];
  const usageTotal = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, nbAppels: 0 };

  const cumuler = (usage) => {
    if (!usage) return;
    usageTotal.inputTokens += usage.inputTokens;
    usageTotal.outputTokens += usage.outputTokens;
    usageTotal.cacheReadTokens += usage.cacheReadTokens;
    usageTotal.cacheWriteTokens += usage.cacheWriteTokens;
    usageTotal.nbAppels += 1;
  };

  for (const lot of lots) {
    try {
      const resultat = await analyserUnLot(lot);
      propositions.push(...resultat.propositions);
      cumuler(resultat.usage);
    } catch (err) {
      console.error('Erreur analyse IA diligences (lot):', err);
      cumuler(err.usage); // un lot illisible a quand même coûté des tokens
      for (const { cycle, points } of lot) {
        for (const p of points) {
          propositions.push({ pointId: p.id, cycleId: cycle.id, statut: null, justification: `Erreur lors de l'analyse automatique : ${err.message}`, source: null });
        }
      }
    }
  }
  return { propositions, usage: usageTotal };
}

// POST /api/diligences-auto/:dossierId — analyse TOUTE la mission en un seul appel IA
// (regroupant tous les cycles narratifs), plus les checks numériques calculés en code par
// cycle (gratuits, aucun appel IA). Les cycles déjà supervisés sont ignorés (verrouillés).
router.post('/:dossierId', authentifier, verifierAccesDossier, requireRole('assistant'), async (req, res) => {
  try {
    const dossier = queryOne('SELECT cycles_reponses_json FROM dossiers WHERE id = ?', [req.params.dossierId]);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });
    const cyclesReponses = safeJSON(dossier.cycles_reponses_json, {});

    const propositions = calculerPropositionsNumeriques(req.params.dossierId, cyclesReponses);
    const sectionsIA = [];

    for (const cycle of CYCLES_DILIGENCES) {
      if (cyclesReponses[cycle.id]?.supervise) continue; // cycle verrouillé, on ne touche pas
      const pointsIA = cycle.points.filter(p => p.automatisation?.type === 'ia');
      if (pointsIA.length > 0) sectionsIA.push({ cycle, points: pointsIA });
    }

    let usage = null;
    if (sectionsIA.length > 0) {
      const resultat = await analyserToutesLesSections(req.params.dossierId, sectionsIA);
      propositions.push(...resultat.propositions);
      usage = { ...resultat.usage, modele: MODELE_IA, coutUSD: calculerCoutUSD(resultat.usage) };
      console.log(
        `[IA] Analyse diligences dossier ${req.params.dossierId} : ${usage.nbAppels} appel(s), ` +
        `${usage.inputTokens} tokens entrée, ${usage.outputTokens} tokens sortie, ` +
        `coût ≈ $${usage.coutUSD.toFixed(4)}`
      );
    }

    res.json({ propositions, usage });
  } catch (err) {
    console.error('Erreur analyse diligences:', err);
    res.status(500).json({ erreur: err.message || 'Erreur serveur' });
  }
});

// POST /api/diligences-auto/:dossierId/numerique — uniquement les checks numériques
// (calcul en code, aucun appel IA) : gratuit et instantané, peut être relancé librement
// (ex. après correction d'un fichier de balance) sans redéclencher l'analyse IA payante.
router.post('/:dossierId/numerique', authentifier, verifierAccesDossier, requireRole('assistant'), async (req, res) => {
  try {
    const dossier = queryOne('SELECT cycles_reponses_json FROM dossiers WHERE id = ?', [req.params.dossierId]);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });
    const cyclesReponses = safeJSON(dossier.cycles_reponses_json, {});

    const propositions = calculerPropositionsNumeriques(req.params.dossierId, cyclesReponses);
    res.json({ propositions });
  } catch (err) {
    console.error('Erreur analyse numérique diligences:', err);
    res.status(500).json({ erreur: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
