const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { queryOne } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans .env — le serveur ne peut pas démarrer sans un secret défini.');
}

// 15 tentatives / 15 min par IP — assez large pour un usage normal (mot de passe oublié,
// clavier CI vs FR...), assez strict pour rendre une attaque par force brute impraticable.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erreur: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
});

// POST /api/auth/connexion
router.post('/connexion', loginLimiter, async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({ erreur: 'Email et mot de passe requis' });
    }

    const user = queryOne(
      'SELECT * FROM utilisateurs WHERE email = ? AND actif = 1',
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }

    const valide = await bcrypt.compare(motDePasse, user.mot_de_passe);
    if (!valide) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { mot_de_passe, ...userSafe } = user;
    res.json({ token, utilisateur: formatUser(userSafe) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/auth/jeton-fichier — short-lived (2 min) token scoped only for the file-preview
// URLs that must be opened in a new browser tab (window.open can't attach an Authorization
// header). Keeps the powerful 30-day session token out of URLs, browser history and server
// access logs — this one is dead within minutes even if it leaks.
router.post('/jeton-fichier', authentifier, (req, res) => {
  const token = jwt.sign({ id: req.userId, role: req.userRole }, JWT_SECRET, { expiresIn: '2m' });
  res.json({ token });
});

// POST /api/auth/changer-mot-de-passe
router.post('/changer-mot-de-passe', authentifier, async (req, res) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;

    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({ erreur: 'Champs requis manquants' });
    }
    if (nouveauMotDePasse.length < 6) {
      return res.status(400).json({ erreur: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    const user = queryOne('SELECT * FROM utilisateurs WHERE id = ?', [req.userId]);
    const valide = await bcrypt.compare(ancienMotDePasse, user.mot_de_passe);
    if (!valide) {
      return res.status(401).json({ erreur: 'Ancien mot de passe incorrect' });
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 10);
    const { run } = require('../db');
    run('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [hash, req.userId]);

    res.json({ succes: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

function formatUser(u) {
  return {
    id: u.id,
    nom: u.nom,
    email: u.email,
    role: u.role,
    initiales: u.initiales,
    actif: u.actif === 1 || u.actif === true,
    dateCreation: u.date_creation,
  };
}

function authentifier(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erreur: 'Non authentifié' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = Number(decoded.id);
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ erreur: 'Token invalide ou expiré' });
  }
}

module.exports = { router, authentifier, formatUser };
