const {getDb, query} = require('./db');
getDb().then(() => {
  const collabs = query("SELECT * FROM collaborateurs_dossier WHERE dossier_id = '1778597149053'");
  console.log('Collaborateurs:', collabs);
  const dossier = query("SELECT id, nom_entite FROM dossiers WHERE id = '1778597149053'");
  console.log('Dossier:', dossier);
}).catch(e => console.error(e.message));
