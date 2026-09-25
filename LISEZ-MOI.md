# FIDEA · Gestion des Missions VISA

## Prérequis (à installer une seule fois)

Télécharger et installer **Node.js** depuis https://nodejs.org (version LTS)

## Lancement

### Sur Windows
Double-cliquez sur `LANCER-WINDOWS.bat`

Deux fenêtres s'ouvrent :
- **FIDEA Serveur** — le moteur de données (port 3001)
- **FIDEA Interface** — l'application (port 3000)

L'application s'ouvre automatiquement dans votre navigateur.

### Sur Mac/Linux
```bash
chmod +x LANCER-MAC.sh
./LANCER-MAC.sh
```

## Architecture

```
FIDEA-VISA/
├── src/              ← Interface React
├── server/           ← Serveur Node.js + base de données
│   ├── data/         ← Base de données SQLite (créée au premier lancement)
│   └── index.js      ← Point d'entrée serveur
├── public/
│   └── templates/    ← Templates Word (lettre, attestation, refus)
└── LANCER-WINDOWS.bat
```

## Comptes par défaut

| Email | Mot de passe | Rôle |
|---|---|---|
| bamba@fidea.ci | expert123 | Expert-Comptable |
| kone@fidea.ci | senior123 | Collaborateur Senior |
| diallo@fidea.ci | assistant123 | Assistant / Stagiaire |

⚠️ Changez les mots de passe après le premier lancement.

## Base de données

Les données sont stockées dans `server/data/fidea.db`.
**Sauvegardez ce fichier régulièrement.**

## Déploiement sur serveur Windows

1. Copier le dossier FIDEA-VISA sur le serveur
2. Installer Node.js sur le serveur
3. Dans le dossier `server/`, lancer : `node index.js`
4. Configurer IIS pour rediriger vers le port 3001
5. L'application est accessible depuis tout le réseau

## Support

En cas de problème, vérifier que :
- Node.js est bien installé (`node --version` dans le terminal)
- Les ports 3000 et 3001 sont libres
- Le dossier `server/data/` est accessible en écriture
