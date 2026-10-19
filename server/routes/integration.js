// Accès machine-à-machine en lecture seule pour FIDEA (l'application du cabinet : clients, KYC,
// saisie). FIDEA interroge cette route toutes les ~15 minutes pour que chaque entité créée ici
// apparaisse dans sa liste de clients. Pas de session utilisateur : un jeton de service
// (VISA_JETON_INTEGRATION, au moins 32 caractères) dans l'en-tête Authorization. Sans jeton
// configuré, la route n'existe pas (404) — une instance d'un autre cabinet n'expose donc rien.
//
// Ne renvoie que l'identité de l'entité et l'état de ses missions : ni chiffres, ni fichiers,
// ni réponses aux diligences.
const express = require('express');
const crypto = require('crypto');
const { query } = require('../db');

const router = express.Router();

const condense = s => crypto.createHash('sha256').update(String(s)).digest();

function verifierJeton(req, res, next) {
  const attendu = (process.env.VISA_JETON_INTEGRATION || '').trim();
  if (attendu.length < 32) return res.status(404).end();
  const fourni = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  // Comparaison à temps constant (sur des condensés de même longueur).
  if (!fourni || !crypto.timingSafeEqual(condense(fourni), condense(attendu))) {
    return res.status(401).json({ erreur: 'Jeton invalide' });
  }
  next();
}

router.get('/dossiers', verifierJeton, (req, res) => {
  const lignes = query(`
    SELECT id, nom_entite, ncc_entite, adresse_entite, nom_gerant, exercice, statut,
           etape_actuelle, date_creation
    FROM dossiers ORDER BY date_creation`);
  res.json({
    dossiers: lignes.map(d => ({
      id: String(d.id),
      nomEntite: d.nom_entite,
      ncc: d.ncc_entite,
      adresse: d.adresse_entite || '',
      gerant: d.nom_gerant || '',
      exercice: d.exercice,
      statut: d.statut,
      etape: d.etape_actuelle,
      dateCreation: d.date_creation,
    })),
  });
});

module.exports = router;
