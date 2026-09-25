const {getDb, query} = require('./db');
getDb().then(() => {
  // Simuler ce que fait le middleware authentifier
  // Token de l'expert connecté - vérifier son userId et userRole
  const jwt = require('jsonwebtoken');
  const token = 'COLLEZ_LE_TOKEN_ICI';
  const decoded = jwt.verify(token, 'fidea_secret_key_2025');
  console.log('Token décodé:', decoded);
}).catch(e => console.error(e.message));
