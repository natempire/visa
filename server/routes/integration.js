// Accès machine-à-machine en lecture seule pour FIDEA (l'application du cabinet : clients, KYC,
// saisie). FIDEA interroge cette route toutes les ~15 minutes pour que chaque entité créée ici
// apparaisse dans sa liste de clients. Pas de session utilisateur : un jeton de service
// (VISA_JETON_INTEGRATION, au moins 32 caractères) dans l'en-tête Authorization. Sans jeton
// configuré, la route n'existe pas (404) — une instance d'un autre cabinet n'expose donc rien.
//
// La liste des dossiers ne renvoie que l'identité de l'entité et l'état de ses missions : ni
// chiffres, ni réponses aux diligences. Deux routes donnent en plus accès aux pièces d'un dossier,
// pour le pré-remplissage de la fiche KYC dans FIDEA : uniquement les PDF et les images (ce que
// FIDEA sait lire), pas les feuilles de travail. Rien n'est jamais écrit, ni dans la base ni sur le
// disque : ces routes ne créent pas le dossier d'une mission qui n'a pas encore de fichiers.
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { query, queryOne } = require('../db');
const { MISSIONS_DIR } = require('../config');
const { analyserNomFichier, nomDossierServeur } = require('./fichiers');

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

const EXTENSIONS_DOCUMENTS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

function dossierDeMission(dossierId) {
  const dossier = queryOne('SELECT nom_entite, exercice FROM dossiers WHERE id = ?', [dossierId]);
  return dossier ? path.join(MISSIONS_DIR, nomDossierServeur(dossier)) : null;
}

// Parcourt les sous-dossiers d'une mission. Les liens symboliques sont ignorés : ils pourraient
// sortir du dossier de la mission.
function parcourir(base, relatif = '') {
  let entrees;
  try {
    entrees = fs.readdirSync(path.join(base, relatif), { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const documents = [];
  for (const entree of entrees) {
    const chemin = relatif ? `${relatif}/${entree.name}` : entree.name;
    if (entree.isDirectory()) {
      documents.push(...parcourir(base, chemin));
    } else if (entree.isFile() && EXTENSIONS_DOCUMENTS.has(path.extname(entree.name).toLowerCase())) {
      const stats = fs.statSync(path.join(base, chemin));
      // Même règle que la liste des fichiers de l'application : la date de création ne survit
      // pas à une copie, on garde la plus ancienne des deux dates.
      const date = stats.birthtimeMs && stats.birthtimeMs < stats.mtimeMs ? stats.birthtime : stats.mtime;
      const { nom, dateUpload } = analyserNomFichier(entree.name, date.toISOString());
      documents.push({ nom, chemin, repertoire: relatif, taille: stats.size, date: dateUpload });
    }
  }
  return documents;
}

// Chemin réel d'un document d'après le chemin relatif reçu, ou null s'il n'est pas acceptable.
// Forme d'abord (ni « .. », ni chemin absolu, ni antislash), puis le disque : un fichier ordinaire
// dont le chemin réel reste dans le dossier de la mission, même à travers un lien symbolique.
function resoudreDocument(base, chemin) {
  if (typeof chemin !== 'string' || !chemin || chemin.includes('\u0000') || chemin.includes('\\')) return null;
  const segments = chemin.split('/');
  if (segments.some(s => !s || s === '.' || s === '..')) return null;
  if (!EXTENSIONS_DOCUMENTS.has(path.extname(chemin).toLowerCase())) return null;
  try {
    const cible = path.join(base, ...segments);
    if (!fs.lstatSync(cible).isFile()) return null;
    const reel = fs.realpathSync(cible);
    return reel.startsWith(fs.realpathSync(base) + path.sep) ? reel : null;
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    throw err;
  }
}

router.get('/dossiers/:id/documents', verifierJeton, (req, res) => {
  const base = dossierDeMission(req.params.id);
  if (!base) return res.status(404).json({ erreur: 'Dossier non trouvé' });
  res.json({ documents: parcourir(base) });
});

// Le chemin relatif (renvoyé par la liste ci-dessus) passe en paramètre : ?chemin=diligences/x/y.pdf
router.get('/dossiers/:id/documents/telecharger', verifierJeton, (req, res) => {
  const base = dossierDeMission(req.params.id);
  if (!base) return res.status(404).json({ erreur: 'Dossier non trouvé' });
  const fichier = resoudreDocument(base, req.query.chemin);
  if (!fichier) return res.status(404).json({ erreur: 'Document non trouvé' });
  // Trace de ce que le jeton a fait sortir (journal du service).
  console.log(`[integration] document lu : dossier ${req.params.id}, ${req.query.chemin}`);
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.attachment(analyserNomFichier(path.basename(fichier), null).nom);
  res.sendFile(fichier, { dotfiles: 'allow' }, err => {
    if (err && !res.headersSent) res.status(500).end();
  });
});

module.exports = router;
