// Configuration d'une instance. Une instance = un cabinet : sa base, ses fichiers de missions,
// son logo et ses modèles Word vivent dans son propre dossier de données, si bien qu'un cabinet
// ne peut jamais voir les données d'un autre (elles ne sont pas dans la même base). Le code,
// lui, est partagé par toutes les instances.
//
// Variables d'environnement (fichier .env à la racine, ou EnvironmentFile du service systemd) :
//   VISA_DATA_DIR               dossier de données (défaut : server/data, l'installation d'origine)
//   VISA_CABINET_NOM            nom affiché (connexion, menu, exports)       ex. FIDEA
//   VISA_CABINET_SOUS_TITRE     ligne sous le nom sur la page de connexion
//   VISA_CABINET_NUMERO_ORDRE   n° d'inscription à l'Ordre (lettre de mission)
//   VISA_EXPERT_PAR_DEFAUT      expert-comptable proposé pour un nouveau dossier
//   VISA_CABINET_DOMAINE_EMAIL  domaine suggéré dans les champs email      ex. fidea.ci
// Dans le dossier de données, facultatifs : logo.png (ou .svg/.jpg) et modeles/<nom>.docx,
// qui remplacent les modèles par défaut de public/templates/.
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.VISA_DATA_DIR
  ? path.resolve(process.env.VISA_DATA_DIR)
  : path.join(__dirname, 'data');

const MISSIONS_DIR = path.join(DATA_DIR, 'missions');
const MODELES_DIR = path.join(DATA_DIR, 'modeles');

const env = (nom, defaut = '') => (process.env[nom] || '').trim() || defaut;

const CABINET = {
  nom: env('VISA_CABINET_NOM', 'Cabinet'),
  sousTitre: env('VISA_CABINET_SOUS_TITRE'),
  numeroOrdre: env('VISA_CABINET_NUMERO_ORDRE'),
  expertParDefaut: env('VISA_EXPERT_PAR_DEFAUT'),
  domaineEmail: env('VISA_CABINET_DOMAINE_EMAIL'),
};

function cheminLogo() {
  for (const ext of ['.png', '.svg', '.jpg']) {
    const p = path.join(DATA_DIR, `logo${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

module.exports = { DATA_DIR, MISSIONS_DIR, MODELES_DIR, CABINET, cheminLogo };
