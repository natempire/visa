const { queryOne } = require('../db');
const { ROLES_NIVEAU } = require('../roles');

// Mirrors how GET /api/dossiers decides visibility: expert/admin can see and act on every
// dossier, senior/assistant only on a dossier they're an explicit collaborator of. Shared
// between dossiers.js (the dossier record itself) and fichiers.js (its uploaded documents) —
// those two must stay in lockstep, or a route guarded by only one of them leaks data the
// other correctly hides.
function dossierAccessible(dossierId, userId, userRole) {
  if (ROLES_NIVEAU[userRole] >= ROLES_NIVEAU.expert) {
    return queryOne('SELECT * FROM dossiers WHERE id = ?', [dossierId]);
  }
  return queryOne(`
    SELECT d.* FROM dossiers d
    INNER JOIN collaborateurs_dossier cd ON d.id = cd.dossier_id
    WHERE d.id = ? AND cd.utilisateur_id = ?
  `, [dossierId, userId]);
}

module.exports = { dossierAccessible };
