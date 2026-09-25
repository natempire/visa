require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');

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

const { router: fichiersRouter, creerStructureDossier } = require('./routes/fichiers');
app.use('/api/fichiers', fichiersRouter);
app.locals.creerStructureDossier = creerStructureDossier;

app.use('/api/ia', require('./routes/ia'));

// Health check
app.get('/api/ping', (req, res) => res.json({ ok: true, version: '1.0.0' }));

// Serve React build in production
const buildPath = path.join(__dirname, '..', 'build');
const fs = require('fs');
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
