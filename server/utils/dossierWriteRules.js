const { ROLES_NIVEAU } = require('../roles');

// Étapes avec un rôle minimum pour être modifiées — mirrors src/context/AppContext.js's
// ETAPES. L'ORDRE des clés reflète l'ordre réel du workflow et sert à dériver etapeActuelle
// côté serveur (voir dossiers.js) — ne pas réordonner sans mettre à jour AppContext.js en
// miroir.
const ETAPES_ROLE_MIN = {
  prise_de_connaissance: 'assistant',
  lettre_de_mission: 'senior',
  demande_documents: 'assistant',
  diligences: 'assistant',
  note_synthese: 'senior',
  bouclage: 'expert',
  attestation: 'expert',
};

// Champs réservés au senior/expert, masqués pour l'assistant derrière "Modifier les données"
// (DossierDetail.js). [cléJS, colonneSQL].
const CHAMPS_RESERVES_NON_ASSISTANT = [
  ['nomGerant', 'nom_gerant'], ['nomAssistant', 'nom_assistant'], ['nomExpert', 'nom_expert'],
  ['planning', 'planning'], ['listeDocuments', 'liste_documents'],
  ['chiffreAffaires', 'chiffre_affaires'], ['nombreHeures', 'nombre_heures'],
  ['montantHonoraires', 'montant_honoraires'], ['totalBilan', 'total_bilan'],
  ['capitauxPropres', 'capitaux_propres'], ['resultatNet', 'resultat_net'],
  ['totalProduits', 'total_produits'],
];

// Rule A — seul un admin peut déverrouiller (true -> false) une note PDC déjà verrouillée.
// La verrouiller (false -> true) reste permis à quiconque peut atteindre l'action côté client.
function verifierDeverrouillageNotePDC(nouvelleValeur, dossierRow, userRole) {
  if (nouvelleValeur === false && !!dossierRow.note_pdc_verrouillee && userRole !== 'admin') {
    return 'Seul un administrateur peut déverrouiller une note de prise de connaissance déjà générée';
  }
  return null;
}

// Rule B — un assistant ne peut pas changer un champ réservé senior/expert. Resoumettre la
// même valeur (comme le faisait l'ancien PUT pleine-page) reste autorisé.
function verifierChampsReserves(corps, dossierRow, userRole) {
  if (userRole !== 'assistant') return null;
  for (const [jsField, sqlField] of CHAMPS_RESERVES_NON_ASSISTANT) {
    if (corps[jsField] !== undefined && String(corps[jsField]) !== String(dossierRow[sqlField] || '')) {
      return `Modification du champ "${jsField}" réservée aux rôles senior/expert`;
    }
  }
  return null;
}

// Rule C — un assistant ne peut pas modifier une étape dont le rôle minimum est supérieur,
// sauf si la donnée envoyée est en fait identique à l'existant (resoumission sans changement).
function verifierRoleEtape(etapeCle, ancienneEtape, nouvelleEtape, userRole) {
  if (userRole !== 'assistant') return null;
  const roleMin = ETAPES_ROLE_MIN[etapeCle];
  if (!roleMin) return null;
  if (JSON.stringify(nouvelleEtape) === JSON.stringify(ancienneEtape)) return null;
  if (ROLES_NIVEAU[userRole] < ROLES_NIVEAU[roleMin]) {
    return `Modification de l'étape "${etapeCle}" réservée au rôle ${roleMin} ou supérieur`;
  }
  return null;
}

module.exports = {
  ETAPES_ROLE_MIN,
  CHAMPS_RESERVES_NON_ASSISTANT,
  verifierDeverrouillageNotePDC,
  verifierChampsReserves,
  verifierRoleEtape,
};
