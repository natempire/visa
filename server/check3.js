const {getDb, query} = require('./db');
getDb().then(() => {
  const users = query("SELECT id, nom, email, role FROM utilisateurs WHERE actif = 1");
  console.log('Utilisateurs:', users);
}).catch(e => console.error(e.message));
