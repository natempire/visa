const express = require('express');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const { authentifier } = require('./auth');

const router = express.Router();

const anthropic = new Anthropic();

// Cette route déclenche un appel payant à Claude Opus par requête, sans aucun contrôle de
// coût auparavant — une boucle côté client ou un jeton divulgué pouvait la marteler sans
// limite. 20 générations / 15 min est large pour un usage normal (plusieurs essais pendant
// qu'on affine les réponses du questionnaire) mais rend un abus coûteux impraticable.
const notePdcLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erreur: 'Trop de générations de note. Réessayez dans quelques minutes.' },
});

const SYSTEM_PROMPT = `Tu es un expert-comptable et commissaire aux comptes senior, spécialisé dans l'audit d'entités appliquant le référentiel SYSCOHADA Révisé (zone OHADA).

À partir des réponses d'un questionnaire de prise de connaissance rempli pour un dossier client, rédige une note de prise de connaissance professionnelle et approfondie, destinée à un expert-comptable pour orienter sa stratégie d'audit et ses diligences.

Consignes de fond :
- Analyse rigoureusement les réponses fournies : ne les paraphrase pas, tire-en des conclusions d'audit.
- Mets l'accent en priorité sur deux catégories de risques, conformément à la norme ISA 315 (révisée) sur la connaissance de l'entité et de son environnement :
  1. Les risques inhérents liés à l'activité de l'entité (secteur, marché, dépendance économique, réglementation applicable, litiges, structure actionnariale, parties liées, groupe, etc.).
  2. Les risques liés au contrôle interne (gouvernance, séparation des tâches, organisation comptable et financière, systèmes d'information, contrôles sur les cycles achats/ventes/paie/trésorerie/stocks, processus de clôture).
- Pour chaque risque identifié, explique en quoi il constitue un risque pour la mission et quelle incidence il devrait avoir sur les diligences à mettre en œuvre (zones à approfondir, contrôles substantifs à renforcer, points d'attention pour la revue des comptes).
- Si une information nécessaire n'a pas été renseignée ou reste ambiguë, signale-le explicitement comme point à clarifier avec le client lors des diligences — n'invente jamais de faits qui ne figurent pas dans les réponses fournies.
- Conclus par une synthèse opérationnelle : les axes prioritaires de la stratégie d'audit et les zones de risque à approfondir en priorité.

Consignes de forme :
- Rédige en français, dans un registre professionnel d'audit.
- Structure la note en sections numérotées avec des titres clairs, en texte brut (pas de markdown, pas d'astérisques, pas de dièses).
- Vise une longueur d'une à deux pages (environ 600 à 900 mots).
- Va directement au contenu de la note, sans préambule ni conclusion générique hors sujet.`;

function construireInvite(nomEntite, sections) {
  const corps = sections.map((section) => {
    const lignes = (section.items || [])
      .filter((item) => item.reponse && String(item.reponse).trim().length > 0)
      .map((item) => {
        let ligne = `- ${item.question}\n  Réponse du client : ${item.reponse}`;
        if (item.commentaire && item.commentaire.trim().length > 0) {
          ligne += `\n  Commentaire de l'expert-comptable : ${item.commentaire}`;
        }
        return ligne;
      })
      .join('\n');
    return `${section.numero}. ${section.label}\n${lignes || '(aucune réponse renseignée pour cette section)'}`;
  }).join('\n\n');

  return `Entité concernée : ${nomEntite || 'non renseignée'}\n\nRéponses du questionnaire de prise de connaissance :\n\n${corps}\n\nRédige la note de prise de connaissance à partir de ces éléments.`;
}

router.post('/note-pdc', authentifier, notePdcLimiter, async (req, res) => {
  try {
    const { nomEntite, sections } = req.body;

    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ erreur: 'Données de prise de connaissance manquantes' });
    }

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: construireInvite(nomEntite, sections) }],
    });

    const texte = message.content
      .filter((bloc) => bloc.type === 'text')
      .map((bloc) => bloc.text)
      .join('\n')
      .trim();

    if (!texte) {
      return res.status(502).json({ erreur: 'Réponse vide de l\'IA' });
    }

    res.json({ texte });
  } catch (err) {
    console.error('Erreur génération note IA:', err);
    res.status(500).json({ erreur: err.message || 'Erreur lors de la génération de la note' });
  }
});

module.exports = router;
