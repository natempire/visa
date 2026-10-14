// Administration d'une instance en ligne de commande (le service doit être arrêté) :
//   node gerer.js creer-admin --email x@cabinet.ci --nom "Prénom Nom"
//   node gerer.js mot-de-passe --email x@cabinet.ci
//   node gerer.js migrer-gudef    (réponses Stocks/Trésorerie -> points du GUDEF, oct. 2026)
// Le mot de passe est tapé au clavier (non affiché), jamais passé en argument : il finirait
// sinon dans l'historique du shell et la liste des processus.
//
// Pourquoi le service doit être arrêté : sql.js garde toute la base en mémoire et réécrit le
// fichier entier à chaque enregistrement. Un compte créé ici pendant que le serveur tourne
// serait écrasé par sa prochaine écriture.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const http = require('http');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { getDb, query, queryOne, run } = require('./db');
const { migrerCyclesReponses } = require('./migrations/gudefStocksTresorerie');
const { DATA_DIR } = require('./config');

const LONGUEUR_MIN = 10;

function arguments_(argv) {
  const res = { commande: argv[0] };
  for (let i = 1; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) throw new Error(`Argument inattendu : ${argv[i]}`);
    res[argv[i].slice(2)] = argv[i + 1];
  }
  return res;
}

function serveurActif() {
  const port = process.env.PORT || 3001;
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/ping', timeout: 2000 }, r => {
      r.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function demanderCache(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(question)) process.stdout.write(s); };
    rl.question(question, reponse => {
      rl.close();
      process.stdout.write('\n');
      resolve(reponse);
    });
  });
}

async function demanderMotDePasse() {
  const mdp = await demanderCache('Mot de passe : ');
  if (mdp.length < LONGUEUR_MIN) throw new Error(`Mot de passe trop court (${LONGUEUR_MIN} caractères minimum).`);
  if ((await demanderCache('Confirmer      : ')) !== mdp) throw new Error('Les deux saisies diffèrent.');
  return bcrypt.hash(mdp, 10);
}

function initiales(nom) {
  return nom.split(/\s+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

async function migrerGudef() {
  const date = new Date().toISOString();
  const dossiers = query('SELECT id, nom_entite, cycles_reponses_json FROM dossiers');
  let nb = 0;
  for (const d of dossiers) {
    let cycles;
    try { cycles = JSON.parse(d.cycles_reponses_json || '{}'); } catch { continue; }
    const migre = migrerCyclesReponses(cycles, date);
    if (!migre) continue;
    run('UPDATE dossiers SET cycles_reponses_json = ? WHERE id = ?', [JSON.stringify(migre), d.id]);
    console.log(`  ${d.nom_entite} (${d.id})`);
    nb++;
  }
  console.log(`${nb} dossier(s) migré(s) sur ${dossiers.length}.`);
}

async function main() {
  const a = arguments_(process.argv.slice(2));
  const motDePasse = ['creer-admin', 'mot-de-passe'].includes(a.commande);
  if (!(motDePasse && a.email) && a.commande !== 'migrer-gudef') {
    console.log('Usage :\n  node gerer.js creer-admin --email x@cabinet.ci --nom "Prénom Nom"\n'
      + '  node gerer.js mot-de-passe --email x@cabinet.ci\n'
      + '  node gerer.js migrer-gudef');
    process.exitCode = 2;
    return;
  }
  if (motDePasse && !process.stdin.isTTY) throw new Error('Lancez cette commande dans un terminal (mot de passe tapé au clavier).');
  if (await serveurActif()) {
    throw new Error(`Le serveur de cette instance tourne (port ${process.env.PORT || 3001}) : arrêtez-le d'abord.`);
  }
  console.log(`Instance : ${DATA_DIR}`);
  await getDb();
  if (a.commande === 'migrer-gudef') return migrerGudef();
  const email = a.email.toLowerCase().trim();
  const existant = queryOne('SELECT id, nom, actif FROM utilisateurs WHERE email = ?', [email]);

  if (a.commande === 'creer-admin') {
    if (!a.nom || !a.nom.trim()) throw new Error('--nom est requis.');
    if (existant) throw new Error(`${email} existe déjà (utilisez mot-de-passe).`);
    const hash = await demanderMotDePasse();
    run('INSERT INTO utilisateurs (nom, email, mot_de_passe, role, initiales) VALUES (?, ?, ?, ?, ?)',
      [a.nom.trim(), email, hash, 'admin', initiales(a.nom)]);
    console.log(`Administrateur ${email} créé.`);
  } else {
    if (!existant) throw new Error(`Aucun compte ${email}.`);
    const hash = await demanderMotDePasse();
    run('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [hash, existant.id]);
    console.log(`Mot de passe de ${email} changé${existant.actif ? '' : ' (compte désactivé : réactivez-le dans l\'application)'}.`);
  }
}

main().catch(err => {
  console.error(`Erreur : ${err.message}`);
  process.exitCode = 1;
});
