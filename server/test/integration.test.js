// Routes de lecture seule ouvertes à FIDEA (routes/integration.js), sur une instance jetable.
//   cd server && npm test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DONNEES = fs.mkdtempSync(path.join(os.tmpdir(), 'visa-test-integration-'));
process.env.VISA_DATA_DIR = DONNEES;
process.env.JWT_SECRET = 'secret-de-test';
const JETON = 'j'.repeat(40);
process.env.VISA_JETON_INTEGRATION = JETON;

const express = require('express');
const { getDb, run } = require('../db');
const integration = require('../routes/integration');
const { MISSIONS_DIR } = require('../config');

let serveur, url;

function ecrire(relatif, contenu = 'contenu') {
  const f = path.join(MISSIONS_DIR, relatif);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, contenu);
  return f;
}

const appel = (route, jeton = JETON) =>
  fetch(url + route, { headers: jeton ? { Authorization: `Bearer ${jeton}` } : {} });
const telecharger = (id, chemin) =>
  appel(`/dossiers/${id}/documents/telecharger?chemin=${encodeURIComponent(chemin)}`);

test.before(async () => {
  await getDb();
  const dossier = (id, nom) => run(
    `INSERT INTO dossiers (id, nom_entite, ncc_entite, exercice, date_creation, cree_par)
     VALUES (?, ?, 'NCC', '2025', '2026-01-01', 1)`, [id, nom]);
  dossier('acme', 'ACME SARL');
  dossier('autre', 'AUTRE SA');
  dossier('vide', 'VIDE SARL');
  ecrire('ACME_SARL_2025/diligences/Pages_informations/1781080474619_RCCM ACME.pdf', 'rccm');
  ecrire('ACME_SARL_2025/prise_de_connaissance/Scan CNI.JPG');
  ecrire('ACME_SARL_2025/diligences/Stocks/feuille de travail.xlsx');
  ecrire('AUTRE_SA_2025/secret.pdf', 'pièce d\'un autre client');
  const app = express();
  app.use(integration);
  await new Promise(ok => { serveur = app.listen(0, '127.0.0.1', ok); });
  url = `http://127.0.0.1:${serveur.address().port}`;
});

test.after(async () => {
  await new Promise(ok => serveur.close(ok));
  fs.rmSync(DONNEES, { recursive: true, force: true });
});

test('sans le bon jeton, rien ne sort', async () => {
  for (const route of ['/dossiers', '/dossiers/acme/documents',
    '/dossiers/acme/documents/telecharger?chemin=prise_de_connaissance/Scan%20CNI.JPG']) {
    assert.strictEqual((await appel(route, null)).status, 401, route);
    assert.strictEqual((await appel(route, 'mauvais')).status, 401, route);
  }
});

test('sans jeton configuré, les routes de documents n\'existent pas', async () => {
  process.env.VISA_JETON_INTEGRATION = '';
  try {
    assert.strictEqual((await appel('/dossiers/acme/documents')).status, 404);
  } finally {
    process.env.VISA_JETON_INTEGRATION = JETON;
  }
});

test('la liste parcourt les sous-dossiers, ne garde que PDF et images, retire l\'horodatage', async () => {
  const { documents } = await (await appel('/dossiers/acme/documents')).json();
  assert.deepStrictEqual(documents.map(d => d.nom).sort(), ['RCCM ACME.pdf', 'Scan CNI.JPG']);
  const rccm = documents.find(d => d.nom === 'RCCM ACME.pdf');
  assert.strictEqual(rccm.repertoire, 'diligences/Pages_informations');
  assert.strictEqual(rccm.chemin, 'diligences/Pages_informations/1781080474619_RCCM ACME.pdf');
  assert.strictEqual(rccm.taille, 4);
  assert.strictEqual(rccm.date, new Date(1781080474619).toISOString());
});

test('dossier inconnu : 404 ; mission sans fichiers : liste vide, et rien n\'est créé', async () => {
  assert.strictEqual((await appel('/dossiers/inconnu/documents')).status, 404);
  assert.strictEqual((await telecharger('inconnu', 'x.pdf')).status, 404);
  assert.deepStrictEqual(await (await appel('/dossiers/vide/documents')).json(), { documents: [] });
  assert.ok(!fs.existsSync(path.join(MISSIONS_DIR, 'VIDE_SARL_2025')));
});

test('le téléchargement rend le fichier sous son nom d\'origine', async () => {
  const r = await telecharger('acme', 'diligences/Pages_informations/1781080474619_RCCM ACME.pdf');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(await r.text(), 'rccm');
  assert.match(r.headers.get('content-disposition'), /attachment; filename="RCCM ACME\.pdf"/);
  assert.strictEqual(r.headers.get('cache-control'), 'no-store');
});

test('impossible de sortir du dossier de la mission', async () => {
  const cibles = [
    '../AUTRE_SA_2025/secret.pdf',
    'diligences/../../AUTRE_SA_2025/secret.pdf',
    '..\\AUTRE_SA_2025\\secret.pdf',
    path.join(MISSIONS_DIR, 'AUTRE_SA_2025', 'secret.pdf'),
    '/etc/passwd.pdf',
    'x\u0000.pdf',
    './diligences//x.pdf',
    '',
  ];
  for (const chemin of cibles) {
    assert.strictEqual((await telecharger('acme', chemin)).status, 404, JSON.stringify(chemin));
  }
  // Traversée encodée deux fois, et paramètre répété (tableau côté Express).
  const double = await appel('/dossiers/acme/documents/telecharger?chemin=..%252FAUTRE_SA_2025%252Fsecret.pdf');
  assert.strictEqual(double.status, 404);
  const tableau = await appel('/dossiers/acme/documents/telecharger?chemin=a.pdf&chemin=b.pdf');
  assert.strictEqual(tableau.status, 404);
});

test('les autres types de fichiers ne sortent pas, même nommés exactement', async () => {
  assert.strictEqual((await telecharger('acme', 'diligences/Stocks/feuille de travail.xlsx')).status, 404);
});

test('un lien symbolique ne permet pas de sortir de la mission', async t => {
  const lien = path.join(MISSIONS_DIR, 'ACME_SARL_2025', 'lien.pdf');
  const lienDossier = path.join(MISSIONS_DIR, 'ACME_SARL_2025', 'lien_dossier');
  try {
    fs.symlinkSync(path.join(MISSIONS_DIR, 'AUTRE_SA_2025', 'secret.pdf'), lien);
    fs.symlinkSync(path.join(MISSIONS_DIR, 'AUTRE_SA_2025'), lienDossier, 'junction');
  } catch (err) {
    return t.skip(`liens symboliques non disponibles ici (${err.code})`);
  }
  try {
    assert.strictEqual((await telecharger('acme', 'lien.pdf')).status, 404);
    assert.strictEqual((await telecharger('acme', 'lien_dossier/secret.pdf')).status, 404);
    const { documents } = await (await appel('/dossiers/acme/documents')).json();
    assert.ok(!documents.some(d => d.nom === 'secret.pdf'));
  } finally {
    fs.rmSync(lien, { force: true });
    fs.rmSync(lienDossier, { force: true, recursive: false });
  }
});
