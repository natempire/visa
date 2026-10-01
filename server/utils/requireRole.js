const { ROLES_NIVEAU } = require('../roles');

// Message par défaut par seuil de rôle — avant, chaque route inlinait son propre
// `if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.X) return res.status(403)...`, avec 4
// formulations différentes en pratique pour le même type de contrôle. Un appelant peut
// toujours passer un message spécifique si le contexte le justifie.
const MESSAGES_PAR_DEFAUT = {
  assistant: 'Accès non autorisé',
  senior: 'Accès réservé aux seniors et experts',
  expert: 'Accès réservé à l\'expert-comptable',
  admin: 'Accès réservé aux administrateurs',
};

// Middleware Express : bloque la requête (403) si le rôle de l'utilisateur authentifié est
// strictement inférieur à `roleMin`. Doit être placé après `authentifier` (lit req.userRole).
function requireRole(roleMin, message) {
  return (req, res, next) => {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU[roleMin]) {
      return res.status(403).json({ erreur: message || MESSAGES_PAR_DEFAUT[roleMin] || 'Accès non autorisé' });
    }
    next();
  };
}

module.exports = { requireRole };
