const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { authentifier } = require('./auth');
const { ROLES_NIVEAU } = require('../roles');
const { resolveDir, listFiles } = require('./fichiers');
const { construireBlocsDocuments } = require('../utils/documentExtraction');
const { soldesOuvertureCloture } = require('../utils/diligencesChecks');
const { CYCLES_DILIGENCES } = require('../../src/utils/diligencesData');

const router = express.Router();
const anthropic = new Anthropic();

const VERIFICATEURS_NUMERIQUES = { soldesOuvertureCloture };

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
      fichiers.push({ nom: f.nom, chemin: require('path').join(dir, f.id) });
    }
  }
  return fichiers;
}

async function analyserPointsIA(cycle, pointsIA, fichiers) {
  const { blocs, ignores } = await construireBlocsDocuments(fichiers);

  if (blocs.length === 0) {
    const justification = ignores.length > 0
      ? `Aucun document exploitable (formats non pris en charge : ${ignores.join(', ')}).`
      : "Aucun document fourni pour ce cycle — impossible d'analyser automatiquement.";
    return pointsIA.map(p => ({ pointId: p.id, statut: null, justification, source: null }));
  }

  const listePoints = pointsIA.map(p => `- id "${p.id}" : ${p.texte}`).join('\n');
  const systemPrompt = `Tu es un expert-comptable senior spécialisé en audit SYSCOHADA (zone OHADA). On te fournit des documents d'un dossier client et une liste de points de contrôle (diligences) à vérifier pour le cycle "${cycle.label}".

Pour chaque point, réponds "oui", "non" ou "na" (non applicable / information absente des documents fournis), avec une justification courte et factuelle citant précisément ce que tu as trouvé ou n'as pas trouvé dans les documents. Ne déduis et n'invente jamais une information qui n'est pas explicitement présente dans les documents fournis — si un document nécessaire est manquant ou illisible, réponds "na" en le précisant.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, au format exact :
[{"id": "...", "statut": "oui"|"non"|"na", "justification": "..."}]`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        ...blocs,
        { type: 'text', text: `Points de contrôle à vérifier :\n${listePoints}` },
      ],
    }],
  });

  const texte = message.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  const jsonMatch = texte.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Réponse de l'IA illisible (JSON non trouvé)");
  const resultats = JSON.parse(jsonMatch[0]);

  return pointsIA.map(p => {
    const r = resultats.find(x => x.id === p.id);
    return r
      ? { pointId: p.id, statut: r.statut, justification: r.justification, source: 'ia' }
      : { pointId: p.id, statut: null, justification: "L'IA n'a pas retourné de réponse pour ce point.", source: null };
  });
}

router.post('/:dossierId/:cycleId', authentifier, async (req, res) => {
  try {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.assistant) {
      return res.status(403).json({ erreur: 'Accès non autorisé' });
    }

    const cycle = CYCLES_DILIGENCES.find(c => c.id === req.params.cycleId);
    if (!cycle) return res.status(404).json({ erreur: 'Cycle inconnu' });

    const pointsAutomatisables = cycle.points.filter(p => p.automatisation);
    if (pointsAutomatisables.length === 0) {
      return res.json({ propositions: [] });
    }

    const fichiers = fichiersDuCycle(req.params.dossierId, cycle.label);
    const propositions = [];

    // Points numériques : calcul en code, sans appel IA.
    const pointsNumeriques = pointsAutomatisables.filter(p => p.automatisation.type === 'numeric');
    const fichiersExcel = fichiers.filter(f => /\.(xlsx|xls)$/i.test(f.nom));
    for (const p of pointsNumeriques) {
      const verificateur = VERIFICATEURS_NUMERIQUES[p.automatisation.check];
      const resultat = verificateur
        ? verificateur(fichiersExcel)
        : { statut: null, justification: 'Vérificateur non implémenté.' };
      propositions.push({ pointId: p.id, statut: resultat.statut, justification: resultat.justification, source: 'numeric' });
    }

    // Points narratifs : un seul appel IA groupé pour tout le cycle.
    const pointsIA = pointsAutomatisables.filter(p => p.automatisation.type === 'ia');
    if (pointsIA.length > 0) {
      try {
        propositions.push(...await analyserPointsIA(cycle, pointsIA, fichiers));
      } catch (err) {
        console.error('Erreur analyse IA diligences:', err);
        propositions.push(...pointsIA.map(p => ({ pointId: p.id, statut: null, justification: `Erreur lors de l'analyse automatique : ${err.message}`, source: null })));
      }
    }

    res.json({ propositions });
  } catch (err) {
    console.error('Erreur analyse diligences:', err);
    res.status(500).json({ erreur: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
