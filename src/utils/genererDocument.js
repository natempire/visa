import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { cabinet, urlModele } from './cabinet';

// Format number as French currency string
const formatMontant = (val) => {
  if (!val) return '';
  const num = Number(String(val).replace(/\s/g, ''));
  if (isNaN(num)) return val;
  return num.toLocaleString('fr-FR');
};

// Modèle du cabinet s'il en a déposé un, sinon celui par défaut (voir server/index.js)
async function fetchTemplate(nom) {
  const response = await fetch(urlModele(nom));
  if (!response.ok) throw new Error(`Impossible de charger le template : ${nom}`);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Core generation function
async function genererDocument(nomTemplate, donnees, nomFichier) {
  try {
    const content = await fetchTemplate(nomTemplate);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '', // Replace missing markers with empty string
    });

    doc.render(donnees);

    const blob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    saveAs(blob, nomFichier);
    return { succes: true };
  } catch (err) {
    console.error('Erreur génération document:', err);
    return { succes: false, erreur: err.message };
  }
}

// Generate lettre de mission
export async function genererLettreMission(dossier) {
  const donnees = {
    NOM_ENTITE: dossier.nomEntite || '',
    NCC_ENTITE: dossier.nccEntite || '',
    ADRESSE_ENTITE: dossier.adresseEntite || '',
    NOM_EXPERT: dossier.nomExpert || cabinet.expertParDefaut,
    NOM_ASSISTANT: dossier.nomAssistant || '',
    PLANNING: dossier.planning || '',
    LISTE_DOCUMENTS: dossier.listeDocuments || '',
    CHIFFRE_AFFAIRES: formatMontant(dossier.chiffreAffaires),
    NOMBRE_HEURES: dossier.nombreHeures || '',
    MONTANT_HONORAIRES: formatMontant(dossier.montantHonoraires),
  };

  const nomFichier = `Lettre_Mission_${dossier.nomEntite}_${dossier.exercice}.docx`
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  return genererDocument('lettre_mission.docx', donnees, nomFichier);
}

// Generate attestation de délivrance
export async function genererAttestation(dossier) {
  const donnees = {
    NOM_ENTITE: dossier.nomEntite || '',
    NCC: dossier.nccEntite || '',   // Template uses {NCC}
    EXERCICE: dossier.exercice || '',
    TOTAL_BILAN: formatMontant(dossier.totalBilan),
    CAPITAUX_PROPRES: formatMontant(dossier.capitauxPropres),
    RESULTAT_NET: formatMontant(dossier.resultatNet),
    CHIFFRE_AFFAIRES: formatMontant(dossier.chiffreAffaires),
    TOTAL_PRODUITS: formatMontant(dossier.totalProduits),
  };

  const nomFichier = `Attestation_VISA_${dossier.nomEntite}_${dossier.exercice}.docx`
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  return genererDocument('attestation.docx', donnees, nomFichier);
}

// Generate refus de délivrance
export async function genererRefus(dossier) {
  const donnees = {
    NOM_ENTITE: dossier.nomEntite || '',
    NOM_GERANT: dossier.nomGerant || '',
    EXERCICE: dossier.exercice || '',
    TOTAL_BILAN: formatMontant(dossier.totalBilan),
    CAPITAUX_PROPRES: formatMontant(dossier.capitauxPropres),
    RESULTAT_NET: formatMontant(dossier.resultatNet),
    CHIFFRE_AFFAIRES: formatMontant(dossier.chiffreAffaires),
    TOTAL_PRODUITS: formatMontant(dossier.totalProduits),
  };

  const nomFichier = `Refus_VISA_${dossier.nomEntite}_${dossier.exercice}.docx`
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  return genererDocument('refus.docx', donnees, nomFichier);
}
