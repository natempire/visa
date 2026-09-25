const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'fidea.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new SQL.Database();
    await initSchema();
  }

  migrateSchema();

  return db;
}

// Adds columns introduced after the initial CREATE TABLE to pre-existing databases.
// initSchema() only runs for brand-new DB files, so any column added later needs an
// explicit ALTER TABLE here — guarded by PRAGMA table_info so it's safe to re-run on
// every startup (SQLite errors if you ADD COLUMN a name that already exists).
function migrateSchema() {
  const existing = query(`PRAGMA table_info(dossiers)`).map(c => c.name);
  const additions = [
    ['historique_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['documents_generes_json', "TEXT NOT NULL DEFAULT '{}'"],
    ['documents_requis_perso_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['note_pdc', "TEXT NOT NULL DEFAULT ''"],
    ['note_pdc_verrouillee', "INTEGER NOT NULL DEFAULT 0"],
  ];
  let changed = false;
  additions.forEach(([name, def]) => {
    if (!existing.includes(name)) {
      db.run(`ALTER TABLE dossiers ADD COLUMN ${name} ${def}`);
      changed = true;
    }
  });
  if (changed) {
    saveDb();
    console.log('Migration dossiers : colonnes historique/documentsGeneres/notePDC/documentsRequisPersonnalises ajoutées.');
  }
}

// Save DB to disk after every write. Writes to a temp file first and renames it over the
// real path — a crash or power loss mid-write leaves either the old file intact or the
// new one fully written, never a half-written fidea.db. A direct writeFileSync(DB_PATH)
// has no such guarantee: an interrupted write truncates the file in place.
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, DB_PATH);
}

async function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mot_de_passe TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'assistant',
      initiales TEXT NOT NULL,
      actif INTEGER NOT NULL DEFAULT 1,
      date_creation TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dossiers (
      id TEXT PRIMARY KEY,
      nom_entite TEXT NOT NULL,
      ncc_entite TEXT NOT NULL,
      adresse_entite TEXT,
      exercice TEXT NOT NULL,
      nom_gerant TEXT,
      chiffre_affaires TEXT,
      nombre_heures TEXT,
      montant_honoraires TEXT,
      total_bilan TEXT,
      capitaux_propres TEXT,
      resultat_net TEXT,
      total_produits TEXT,
      nom_expert TEXT,
      nom_assistant TEXT,
      planning TEXT,
      liste_documents TEXT,
      statut TEXT NOT NULL DEFAULT 'en_cours',
      date_creation TEXT NOT NULL,
      cree_par INTEGER NOT NULL,
      etape_actuelle INTEGER NOT NULL DEFAULT 1,
      etapes_json TEXT NOT NULL DEFAULT '{}',
      cycles_assignations_json TEXT NOT NULL DEFAULT '{}',
      cycles_reponses_json TEXT NOT NULL DEFAULT '{}',
      documents_recus_json TEXT NOT NULL DEFAULT '{}',
      historique_json TEXT NOT NULL DEFAULT '[]',
      documents_generes_json TEXT NOT NULL DEFAULT '{}',
      documents_requis_perso_json TEXT NOT NULL DEFAULT '[]',
      note_pdc TEXT NOT NULL DEFAULT '',
      note_pdc_verrouillee INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (cree_par) REFERENCES utilisateurs(id)
    );

    CREATE TABLE IF NOT EXISTS collaborateurs_dossier (
      dossier_id TEXT NOT NULL,
      utilisateur_id INTEGER NOT NULL,
      PRIMARY KEY (dossier_id, utilisateur_id),
      FOREIGN KEY (dossier_id) REFERENCES dossiers(id),
      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
    );
  `);

  // Seed default users
  const motDePasseExpert = bcrypt.hashSync('expert123', 10);
  const motDePasseSenior = bcrypt.hashSync('senior123', 10);
  const motDePasseAssistant = bcrypt.hashSync('assistant123', 10);

  db.run(`
    INSERT OR IGNORE INTO utilisateurs (nom, email, mot_de_passe, role, initiales) VALUES
    ('Bamba Souleymane', 'bamba@fidea.ci', '${motDePasseExpert}', 'expert', 'BS'),
    ('Koné Adjoua', 'kone@fidea.ci', '${motDePasseSenior}', 'senior', 'KA'),
    ('Diallo Mamadou', 'diallo@fidea.ci', '${motDePasseAssistant}', 'assistant', 'DM');
  `);

  saveDb();
  console.log('Base de données initialisée avec les utilisateurs par défaut.');
}

// Query helpers
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

module.exports = { getDb, saveDb, query, queryOne, run };
