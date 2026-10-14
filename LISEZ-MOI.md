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

## Un cabinet = une instance

Chaque cabinet a sa propre instance : sa base, ses fichiers de missions, son logo et ses modèles
Word sont dans son dossier de données, si bien qu'un cabinet ne voit jamais les données d'un
autre. Le code est commun. Réglages (fichier `.env` à la racine, ou fichier d'environnement du
service) :

| Variable | Rôle |
|---|---|
| `JWT_SECRET` | secret des sessions — **différent pour chaque instance** |
| `PORT` | port du serveur (une valeur par instance) |
| `VISA_DATA_DIR` | dossier de données (défaut : `server/data`) |
| `VISA_CABINET_NOM` | nom affiché (connexion, menu, exports) |
| `VISA_CABINET_SOUS_TITRE` | ligne sous le nom, page de connexion |
| `VISA_CABINET_NUMERO_ORDRE` | n° d'inscription à l'Ordre (lettre de mission) |
| `VISA_EXPERT_PAR_DEFAUT` | expert-comptable proposé pour un nouveau dossier |
| `VISA_CABINET_DOMAINE_EMAIL` | domaine suggéré dans les champs email |
| `ANTHROPIC_API_KEY` | clé de l'IA (diligences automatiques) |

Facultatif, dans le dossier de données : `logo.png` (ou `.svg`/`.jpg`) remplace le nom écrit, et
`modeles/<nom>.docx` remplace le modèle Word par défaut du même nom (`public/templates/`).

## Premier compte

Une base neuve n'a **aucun compte**. Service arrêté, dans `server/` :

```bash
node gerer.js creer-admin --email prenom.nom@cabinet.ci --nom "Prénom Nom"
node gerer.js mot-de-passe --email prenom.nom@cabinet.ci     # mot de passe oublié
```

Le mot de passe est tapé au clavier (10 caractères minimum). Les autres comptes se créent
ensuite dans l'application (page Utilisateurs).

## Base de données

Les données sont dans `<dossier de données>/fidea.db` et `<dossier de données>/missions/`.
**Sauvegardez ce dossier régulièrement.**

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
