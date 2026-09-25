const {getDb, run, query} = require('./db');
getDb().then(() => {
  const dossiers = query("SELECT id FROM dossiers");
  dossiers.forEach(d => {
    run("INSERT OR IGNORE INTO collaborateurs_dossier (dossier_id, utilisateur_id) VALUES (?, 1)", [d.id]);
  });
  console.log('Expert ajouté à ' + dossiers.length + ' dossiers');
}).catch(e => console.error(e.message));
