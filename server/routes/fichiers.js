const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authentifier } = require('./auth');
const { queryOne } = require('../db');
const { dossierAccessible } = require('../utils/dossierAccess');
const { requireRole } = require('../utils/requireRole');

const router = express.Router();

function nomDossierServeur(dossier) {
  const nom = (dossier.nom_entite || 'mission').replace(/[^a-zA-Z0-9\u00C0-\u024F\s_\-]/g, '').trim().replace(/\s+/g, '_');
  const ex = dossier.exercice || '';
  return `${nom}_${ex}`;
}

// Resolves `target` against `baseDir` and throws unless the result stays inside
// baseDir — blocks path traversal via "../" segments in any client-supplied path piece
// (contexte, filename), which are otherwise joined straight into filesystem paths.
function safeResolve(baseDir, target) {
  const resolvedBase = path.resolve(baseDir);
  const resolved = path.resolve(baseDir, target || '');
  if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
    throw new Error('Chemin invalide');
  }
  return resolved;
}

function resolveDir(dossierId, contexte) {
  const dossier = queryOne('SELECT nom_entite, exercice FROM dossiers WHERE id = ?', [dossierId]);
  if (!dossier) throw new Error('Dossier non trouvé');
  const base = path.join(__dirname, '..', 'data', 'missions', nomDossierServeur(dossier));
  const dir = safeResolve(base, contexte);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function creerStructureDossier(dossierId) {
  try {
    const dossier = queryOne('SELECT nom_entite, exercice FROM dossiers WHERE id = ?', [dossierId]);
    if (!dossier) return;
    const base = path.join(__dirname, '..', 'data', 'missions', nomDossierServeur(dossier));
    const dossiers = [
      'documents_generes',
      'prise_de_connaissance',
      'diligences/Organisation_comptable',
      'diligences/Pages_informations',
      'diligences/Capitaux_propres',
      'diligences/Immobilisations',
      'diligences/Stocks',
      'diligences/Clients',
      'diligences/Fournisseurs',
      'diligences/Personnel',
      'diligences/Etat_collectivites',
      'diligences/Divers',
      'diligences/Tresorerie',
      'diligences/Comptes_charges',
      'diligences/Comptes_produits',
      'diligences/Etats_annexes',
    ];
    dossiers.forEach(d => fs.mkdirSync(path.join(base, d), { recursive: true }));
    console.log(`📁 Structure créée pour : ${nomDossierServeur(dossier)}`);
  } catch (err) {
    console.error('Erreur création structure:', err);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dir = resolveDir(req.params.dossierId, req.params.contexte);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F ]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/plain', 'text/csv',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé'));
  }
});

// Toutes les routes ci-dessous exposent les documents D'UN dossier précis — sans ce contrôle,
// n'importe quel utilisateur authentifié pouvait lister/télécharger/supprimer les fichiers de
// n'importe quel dossier (y compris ceux d'autres équipes) en devinant son id, puisque ni
// resolveDir() ni les routes elles-mêmes ne vérifiaient l'appartenance — seule l'existence du
// dossier. Même règle d'accès que dossiers.js (dossierAccessible), appliquée ici en middleware
// pour s'exécuter AVANT tout accès disque, y compris avant que multer n'écrive un fichier reçu.
function verifierAccesDossier(req, res, next) {
  if (!dossierAccessible(req.params.dossierId, req.userId, req.userRole)) {
    return res.status(404).json({ erreur: 'Dossier non trouvé' });
  }
  next();
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => !fs.statSync(path.join(dir, f)).isDirectory())
    .map(filename => {
      const filePath = path.join(dir, filename);
      const stats = fs.statSync(filePath);
      const parts = filename.split('_');
      const ts = parseInt(parts[0]);
      const originalName = parts.slice(1).join('_');
      return {
        id: filename,
        nom: originalName,
        taille: stats.size,
        dateUpload: isNaN(ts) ? stats.birthtime.toISOString() : new Date(ts).toISOString(),
        type: path.extname(originalName).toLowerCase().replace('.', ''),
      };
    })
    .sort((a, b) => new Date(b.dateUpload) - new Date(a.dateUpload));
}

// !! ROUTES SPECIFIQUES EN PREMIER — avant les routes génériques !!

// GET /api/fichiers/:dossierId/fichier/:contexte/:filename — serve file
router.get('/:dossierId/fichier/:contexte(*)/:filename', (req, res, next) => {
  if (req.query.token) req.headers.authorization = 'Bearer ' + req.query.token;
  next();
}, authentifier, verifierAccesDossier, (req, res) => {
  try {
    const dir = resolveDir(req.params.dossierId, req.params.contexte);
    const filePath = safeResolve(dir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ erreur: 'Fichier non trouvé' });

    const parts = req.params.filename.split('_');
    const originalName = parts.slice(1).join('_');
    const ext = path.extname(originalName).toLowerCase();
    const inlineTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.doc': 'application/msword',
      '.xls': 'application/vnd.ms-excel',
    };
    if (mimeTypes[ext]) res.setHeader('Content-Type', mimeTypes[ext]);

    if (inlineTypes.includes(ext)) {
      res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    }
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /api/fichiers/:dossierId/fichier/:contexte/:filename
router.delete('/:dossierId/fichier/:contexte(*)/:filename', authentifier, verifierAccesDossier, requireRole('senior'), (req, res) => {
  try {
    const dir = resolveDir(req.params.dossierId, req.params.contexte);
    const filePath = safeResolve(dir, req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ succes: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/fichiers/:dossierId/sauvegarder-genere
router.post('/:dossierId/sauvegarder-genere', authentifier, verifierAccesDossier, requireRole('senior'), (req, res) => {
  try {
    const { nomFichier, contenuBase64 } = req.body;
    if (!nomFichier || !contenuBase64) return res.status(400).json({ erreur: 'Données manquantes' });

    const dir = resolveDir(req.params.dossierId, 'documents_generes');
    const filePath = safeResolve(dir, nomFichier);
    fs.writeFileSync(filePath, Buffer.from(contenuBase64, 'base64'));

    res.json({ succes: true, chemin: filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur sauvegarde' });
  }
});

// GET /api/fichiers/:dossierId/:contexte — list files (route générique EN DERNIER)
router.get('/:dossierId/:contexte(*)', (req, res, next) => {
  if (req.query.token) req.headers.authorization = 'Bearer ' + req.query.token;
  next();
}, authentifier, verifierAccesDossier, (req, res) => {
  try {
    const dir = resolveDir(req.params.dossierId, req.params.contexte);
    res.json(listFiles(dir));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: err.message });
  }
});

// POST /api/fichiers/:dossierId/:contexte — upload file (route générique EN DERNIER)
router.post('/:dossierId/:contexte(*)', authentifier, verifierAccesDossier, upload.single('fichier'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier reçu' });
    const parts = req.file.filename.split('_');
    const ts = parseInt(parts[0]);
    const originalName = parts.slice(1).join('_');
    res.json({
      id: req.file.filename,
      nom: originalName,
      taille: req.file.size,
      dateUpload: new Date(ts).toISOString(),
      type: path.extname(originalName).toLowerCase().replace('.', ''),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur upload' });
  }
});

module.exports = { router, creerStructureDossier, resolveDir, listFiles, nomDossierServeur };