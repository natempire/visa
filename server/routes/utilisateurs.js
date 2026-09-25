const express = require('express');
const bcrypt = require('bcryptjs');
const { query, queryOne, run } = require('../db');
const { authentifier, formatUser } = require('./auth');
const { ROLES_NIVEAU } = require('../roles');

const router = express.Router();

// GET /api/utilisateurs — liste tous les utilisateurs actifs
router.get('/', authentifier, (req, res) => {
  try {
    const users = query('SELECT * FROM utilisateurs WHERE actif = 1 ORDER BY role DESC, nom ASC');
    res.json(users.map(u => {
      const { mot_de_passe, ...safe } = u;
      return formatUser(safe);
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/utilisateurs — créer un utilisateur (expert/admin seulement)
router.post('/', authentifier, async (req, res) => {
  try {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.expert) {
      return res.status(403).json({ erreur: 'Accès réservé à l\'expert-comptable' });
    }

    const { nom, email, motDePasse, role } = req.body;

    if (!nom || !email || !motDePasse || !role) {
      return res.status(400).json({ erreur: 'Tous les champs sont requis' });
    }
    if (!['admin', 'expert', 'senior', 'assistant'].includes(role)) {
      return res.status(400).json({ erreur: 'Rôle invalide' });
    }
    // Only an existing admin can grant the admin role — an expert could otherwise
    // create themselves/a colleague an account with more power than their own.
    if (role === 'admin' && req.userRole !== 'admin') {
      return res.status(403).json({ erreur: 'Seul un administrateur peut créer un compte administrateur' });
    }
    if (motDePasse.length < 6) {
      return res.status(400).json({ erreur: 'Mot de passe trop court (6 caractères minimum)' });
    }

    const existant = queryOne('SELECT id FROM utilisateurs WHERE email = ?', [email.toLowerCase().trim()]);
    if (existant) {
      return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    }

    const hash = await bcrypt.hash(motDePasse, 10);
    const initiales = nom.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

    run(
      'INSERT INTO utilisateurs (nom, email, mot_de_passe, role, initiales) VALUES (?, ?, ?, ?, ?)',
      [nom.trim(), email.toLowerCase().trim(), hash, role, initiales]
    );

    const nouveau = queryOne('SELECT * FROM utilisateurs WHERE email = ?', [email.toLowerCase().trim()]);
    const { mot_de_passe, ...safe } = nouveau;
    res.status(201).json(formatUser(safe));

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PUT /api/utilisateurs/:id — modifier un utilisateur (expert/admin seulement)
router.put('/:id', authentifier, async (req, res) => {
  try {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.expert) {
      return res.status(403).json({ erreur: 'Accès réservé à l\'expert-comptable' });
    }

    const { nom, email, role, motDePasse } = req.body;
    const userId = parseInt(req.params.id);

    const user = queryOne('SELECT * FROM utilisateurs WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ erreur: 'Utilisateur non trouvé' });

    if (role && !['admin', 'expert', 'senior', 'assistant'].includes(role)) {
      return res.status(400).json({ erreur: 'Rôle invalide' });
    }
    // Only an existing admin can grant or already hold the admin role.
    if (role === 'admin' && req.userRole !== 'admin') {
      return res.status(403).json({ erreur: 'Seul un administrateur peut accorder le rôle administrateur' });
    }

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const existant = queryOne('SELECT id FROM utilisateurs WHERE email = ? AND id != ?', [email.toLowerCase().trim(), userId]);
      if (existant) return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    }

    const nouveauNom = nom || user.nom;
    const nouvelEmail = email ? email.toLowerCase().trim() : user.email;
    const nouveauRole = role || user.role;
    const nouvellesInitiales = nouveauNom.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

    if (motDePasse) {
      if (motDePasse.length < 6) return res.status(400).json({ erreur: 'Mot de passe trop court' });
      const hash = await bcrypt.hash(motDePasse, 10);
      run('UPDATE utilisateurs SET nom=?, email=?, role=?, initiales=?, mot_de_passe=? WHERE id=?',
        [nouveauNom, nouvelEmail, nouveauRole, nouvellesInitiales, hash, userId]);
    } else {
      run('UPDATE utilisateurs SET nom=?, email=?, role=?, initiales=? WHERE id=?',
        [nouveauNom, nouvelEmail, nouveauRole, nouvellesInitiales, userId]);
    }

    const updated = queryOne('SELECT * FROM utilisateurs WHERE id = ?', [userId]);
    const { mot_de_passe, ...safe } = updated;
    res.json(formatUser(safe));

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /api/utilisateurs/:id — désactiver un utilisateur (expert seulement)
router.delete('/:id', authentifier, (req, res) => {
  try {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.expert) {
      return res.status(403).json({ erreur: 'Accès réservé à l\'expert-comptable' });
    }

    const userId = parseInt(req.params.id);
    if (userId === req.userId) {
      return res.status(400).json({ erreur: 'Vous ne pouvez pas désactiver votre propre compte' });
    }

    run('UPDATE utilisateurs SET actif = 0 WHERE id = ?', [userId]);
    res.json({ succes: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
