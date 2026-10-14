require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./db');
const { CABINET, DATA_DIR, MODELES_DIR, cheminLogo } = require('./config');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Bypass ngrok browser warning for all responses
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/utilisateurs', require('./routes/utilisateurs'));
app.use('/api/dossiers', require('./routes/dossiers'));

app.use('/api/fichiers', require('./routes/fichiers').router);

app.use('/api/ia', require('./routes/ia'));
app.use('/api/diligences-auto', require('./routes/diligencesAuto'));

// Health check
app.get('/api/ping', (req, res) => res.json({ ok: true, version: '1.0.0' }));

// Identité du cabinet de cette instance — publique, la page de connexion en a besoin.
app.get('/api/cabinet', (req, res) => res.json({ ...CABINET, logo: !!cheminLogo() }));
app.get('/api/cabinet/logo', (req, res) => {
  const logo = cheminLogo();
  if (!logo) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=86400').sendFile(logo);
});
// Modèle Word : celui du cabinet (dossier de données/modeles/) s'il existe, sinon celui par
// défaut livré avec l'application. Le nom est filtré : pas de chemin, seulement x.docx.
const MODELES_DEFAUT = path.join(__dirname, '..', 'public', 'templates');
app.get('/api/cabinet/modeles/:nom', (req, res) => {
  const nom = req.params.nom;
  if (!/^[\w-]+\.docx$/.test(nom)) return res.status(400).json({ erreur: 'Nom de modèle invalide' });
  const perso = path.join(MODELES_DIR, nom);
  const defaut = path.join(MODELES_DEFAUT, nom);
  const fichier = fs.existsSync(perso) ? perso : defaut;
  if (!fs.existsSync(fichier)) return res.status(404).json({ erreur: 'Modèle introuvable' });
  res.set('Cache-Control', 'no-cache').sendFile(fichier);
});

// Serve React build in production
const buildPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Start
async function start() {
  await getDb(); // Initialize DB
  app.listen(PORT, () => {
    console.log(`\n✅ Serveur FIDEA démarré sur http://localhost:${PORT}`);
    console.log(`   API : http://localhost:${PORT}/api/ping`);
    console.log(`   Base de données : ./data/fidea.db\n`);
  });
}

start().catch(err => {
  console.error('Erreur démarrage serveur:', err);
  process.exit(1);
});
