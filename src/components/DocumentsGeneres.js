import React, { useState, useEffect } from 'react';
import { FileText, Award, FileDown, Download, Loader, CheckCircle, Clock, Eye } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';
import { api } from '../utils/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { CYCLES_DILIGENCES, DOCUMENTS_REQUIS } from '../utils/diligencesData';
import { cabinet, urlModele } from '../utils/cabinet';


const DOCS_CONFIG = [
  { id: 'lettre_mission', label: 'Lettre de mission', icone: FileText, roleMin: 'senior', template: 'lettre_mission.docx' },
  { id: 'diligences', label: 'Rapport de diligences', icone: FileText, roleMin: 'senior', template: 'diligences.docx' },
  { id: 'note_synthese', label: 'Note de synthèse', icone: FileText, roleMin: 'senior', template: 'note_synthese.docx' },
  { id: 'bouclage', label: 'Bouclage dossier', icone: FileDown, roleMin: 'expert', template: 'bouclage.docx' },
  { id: 'attestation', label: 'Attestation de VISA', icone: Award, roleMin: 'expert', template: 'attestation.docx' },
  { id: 'refus', label: 'Refus de délivrance', icone: FileDown, roleMin: 'expert', template: 'refus.docx', danger: true },
];

function formatMontant(val) {
  if (!val) return '';
  const num = Number(String(val).replace(/\s/g, ''));
  if (isNaN(num)) return val;
  return num.toLocaleString('fr-FR');
}

async function genererEtSauvegarder(dossier, docConfig, utilisateurs) {
  const templateUrl = urlModele(docConfig.template);
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error('Template non trouvé');
  const arrayBuffer = await response.arrayBuffer();
  const content = new Uint8Array(arrayBuffer);

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });

  const planning = dossier.etapes?.lettre_de_mission?.planning || dossier.planning || '';
  const lettreMission = dossier.etapes?.lettre_de_mission || {};
  const noteSynthese = dossier.etapes?.note_synthese || {};
  const etatsFinanciers = noteSynthese.etatsFinanciers || {};
  const pointsControle = noteSynthese.pointsControle || {};

  const donnees = {
    NOM_ENTITE: dossier.nomEntite || '',
    NOM_CLIENT: dossier.nomEntite || '',
    NCC_ENTITE: dossier.nccEntite || '',
    NCC: dossier.nccEntite || '',
    ADRESSE_ENTITE: dossier.adresseEntite || '',
    NOM_EXPERT: dossier.nomExpert || cabinet.expertParDefaut,
    NOM_ASSISTANT: dossier.nomAssistant || '',
    PLANNING: planning,
    LISTE_DOCUMENTS: dossier.etapes?.lettre_de_mission?.listeDocuments || dossier.listeDocuments || '',
    CHIFFRE_AFFAIRES: formatMontant(dossier.chiffreAffaires),
    NOMBRE_HEURES: dossier.nombreHeures || '',
    MONTANT_HONORAIRES: formatMontant(dossier.montantHonoraires),
    NOM_GERANT: dossier.nomGerant || '',
    EXERCICE: dossier.exercice || '',
    DATE_CLOTURE: dossier.exercice ? `31 décembre ${dossier.exercice}` : '',
    DATE_DEBUT: planning.includes(' au ') ? planning.split(' au ')[0].replace(/^Du /i, '').trim() : '',
    DATE_FIN: planning.includes(' au ') ? planning.split(' au ')[1]?.trim() : '',
    // Lettre de mission — date d'émission + calendrier détaillé (tableau "Exécution et
    // déroulement de la mission") + numéro d'inscription à l'Ordre du cabinet
    DATE_LETTRE: format(new Date(), 'd MMMM yyyy', { locale: fr }),
    DATE_PHASE1: lettreMission.datePhase1 || '',
    DATE_PHASE2: lettreMission.datePhase2 || '',
    DATE_PHASE3: lettreMission.datePhase3 || '',
    DATE_PHASE4: lettreMission.datePhase4 || '',
    NUM_INSCRIPTION: cabinet.numeroOrdre,
    // Attestation — date de la lettre de mission visée ("en date du ...", était un an
    // brut avant correction). Réutilise la date de la 1ère phase (prise de connaissance
    // / signature de la lettre de mission) déjà saisie à l'étape Lettre de mission.
    DATE_LETTRE_MISSION: lettreMission.datePhase1 || '',
    TOTAL_BILAN: formatMontant(dossier.totalBilan),
    CAPITAUX_PROPRES: formatMontant(dossier.capitauxPropres),
    RESULTAT_NET: formatMontant(dossier.resultatNet),
    TOTAL_PRODUITS: formatMontant(dossier.totalProduits),
    // États financiers (note de synthèse)
    EF_BILAN: etatsFinanciers.bilan === 'oui' ? 'Oui' : 'Non',
    EF_COMPTE_RESULTAT: etatsFinanciers.compte_resultat === 'oui' ? 'Oui' : 'Non',
    EF_TABLEAU_FLUX: etatsFinanciers.tableau_flux === 'oui' ? 'Oui' : 'Non',
    EF_ANNEXES: etatsFinanciers.annexes === 'oui' ? 'Oui' : 'Non',
    // Points de contrôle (note de synthèse)
    PC_COHERENCE_RESULTAT: pointsControle.coherence_globale?.resultat || '',
    PC_COHERENCE_OBS: pointsControle.coherence_globale?.observation || '',
    PC_CONCORDANCE_RESULTAT: pointsControle.concordance_balance?.resultat || '',
    PC_CONCORDANCE_OBS: pointsControle.concordance_balance?.observation || '',
    PC_CONFORMITE_RESULTAT: pointsControle.conformite_ohada?.resultat || '',
    PC_CONFORMITE_OBS: pointsControle.conformite_ohada?.observation || '',
    PC_VRAISEMBLANCE_RESULTAT: pointsControle.vraisemblance?.resultat || '',
    PC_VRAISEMBLANCE_OBS: pointsControle.vraisemblance?.observation || '',
    PC_ANNEXES_RESULTAT: pointsControle.presentation_annexes?.resultat || '',
    PC_ANNEXES_OBS: pointsControle.presentation_annexes?.observation || '',
    // Conclusion
    CONCLUSION: noteSynthese.conclusion || '',
  };

  // Inject diligences data — derived from CYCLES_DILIGENCES (the same source the
  // questionnaire itself uses) so the point IDs can never drift out of sync with
  // what the template expects.
  const cyclesReponses = dossier.cyclesReponses || {};

  CYCLES_DILIGENCES.forEach(cycle => {
    const cycleReponse = cyclesReponses[cycle.id] || {};
    const cycleData = cycleReponse.points || {};
    cycle.points.forEach(point => {
      const pidUp = point.id.toUpperCase();
      const pointData = cycleData[point.id] || {};
      const statut = pointData.statut || '';
      donnees[`OUI_${pidUp}`] = statut === 'oui' ? '✓' : '';
      donnees[`NON_${pidUp}`] = statut === 'non' ? '✓' : '';
      donnees[`NA_${pidUp}`] = statut === 'na' ? '✓' : '';
      donnees[`C_${pidUp}`] = pointData.commentaire || '';
    });

    // Signature footer ("Fait par" / "Supervisé par") — identity + date, per cycle.
    // Prefix matches the cycle's own point-id prefix (e.g. 'oc_1' -> 'OC'), the same
    // convention already used for the OUI_/NON_/NA_/T_ tags above.
    const prefix = cycle.points[0].id.split('_')[0].toUpperCase();
    const faitParUser = (utilisateurs || []).find(u => u.id === cycleReponse.faitPar);
    const superviseUser = (utilisateurs || []).find(u => u.id === cycleReponse.supervise);
    donnees[`FAIT_PAR_${prefix}`] = faitParUser?.nom || '';
    donnees[`DATE_FAIT_${prefix}`] = cycleReponse.dateFait ? format(new Date(cycleReponse.dateFait), 'dd/MM/yyyy', { locale: fr }) : '';
    donnees[`SUPERVISE_PAR_${prefix}`] = superviseUser?.nom || '';
    donnees[`DATE_SUPERVISE_${prefix}`] = cycleReponse.dateSupervise ? format(new Date(cycleReponse.dateSupervise), 'dd/MM/yyyy', { locale: fr }) : '';
  });

  // Inject bouclage data
  const pointsBouclage = dossier.etapes?.bouclage?.pointsBouclage || {};
  ['b1','b2','b3','b4','b5','b6','b7','b8'].forEach(bid => {
    const bUp = bid.toUpperCase();
    const bData = pointsBouclage[bid] || {};
    const bStatut = bData.statut || '';
    donnees[`STATUT_${bUp}`] = bStatut === 'ok' ? 'OK ✓' : bStatut === 'nok' ? 'NON OK' : bStatut === 'na' ? 'N/A' : '';
    donnees[`OBS_${bUp}`] = bData.observation || '';
  });
  donnees['OBS_GENERALE'] = dossier.etapes?.bouclage?.obsGenerale || '';

  // État des documents demandés — remplit les cases OK / Non Disponible / Non Applicable
  // de la section "LISTE INDICATIVE DE DOCUMENTS A OBTENIR" déjà présente dans le rapport
  // (étape "Demande de documents"). Les 13 documents standards ont chacun leur propre case
  // (DOC_<n>_OK/NDISP/NA, n = position dans DOCUMENTS_REQUIS) ; tout document ajouté au-delà
  // de la liste standard vient s'ajouter en ligne(s) supplémentaire(s) via la boucle docsPerso.
  const documentsRecus = dossier.documentsRecus || {};
  DOCUMENTS_REQUIS.forEach((d, idx) => {
    const n = idx + 1;
    const statut = documentsRecus[d.id];
    donnees[`DOC_${n}_OK`] = statut === 'ok' ? '✓' : '';
    donnees[`DOC_${n}_NDISP`] = statut === 'non_disponible' ? '✓' : '';
    donnees[`DOC_${n}_NA`] = statut === 'non_applicable' ? '✓' : '';
  });
  donnees.docsPerso = (dossier.documentsRequisPersonnalises || []).map((d, idx) => {
    const statut = documentsRecus[d.id];
    return {
      numero: DOCUMENTS_REQUIS.length + idx + 1,
      nom: d.nom,
      ok: statut === 'ok' ? '✓' : '',
      ndisp: statut === 'non_disponible' ? '✓' : '',
      na: statut === 'non_applicable' ? '✓' : '',
    };
  });

  doc.render(donnees);

  const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const nomFichier = `${docConfig.id}_${dossier.nomEntite}_${dossier.exercice}.docx`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  // Save to server
  // Convert blob to base64 safely (handles large files)
  const arrayBuf = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuf);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8.slice(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  await api.sauvegarderDocGenere(dossier.id, nomFichier, base64);

  // Also download locally
  const { saveAs } = await import('file-saver');
  saveAs(blob, nomFichier);

  return { succes: true, nomFichier };
}

export default function DocumentsGeneres({ dossier }) {
  const { utilisateurConnecte, utilisateurs, mettreAJourDossierComplet, ajouterHistorique, ROLES } = useApp();
  const [chargements, setChargements] = useState({});
  const [fichiersServeur, setFichiersServeur] = useState([]);

  const docsGeneres = dossier.documentsGeneres || {};
  const roleNiveau = ROLES_NIVEAU[utilisateurConnecte?.role] || 0;

  useEffect(() => {
    chargerFichiersServeur();
  }, [dossier.id]);

  const chargerFichiersServeur = async () => {
    try {
      const data = await api.getFichiers(dossier.id, 'documents_generes');
      setFichiersServeur(data);
    } catch { setFichiersServeur([]); }
  };

  const handleGenerer = async (doc) => {
    setChargements(prev => ({ ...prev, [doc.id]: true }));
    try {
      const result = await genererEtSauvegarder(dossier, doc, utilisateurs);
      if (result.succes) {
        const documentsGeneres = {
          ...docsGeneres,
          [doc.id]: { genereLe: new Date().toISOString(), generePar: utilisateurConnecte.nom, nomFichier: result.nomFichier }
        };
        await mettreAJourDossierComplet(dossier.id, { documentsGeneres });
        await chargerFichiersServeur();
        ajouterHistorique(dossier.id, `Document "${doc.label}" généré`);
      }
    } catch (err) { console.error(err); }
    finally { setChargements(prev => ({ ...prev, [doc.id]: false })); }
  };

  const voirDocument = async (doc) => {
    const genere = docsGeneres[doc.id];
    if (!genere?.nomFichier) return;
    const fichier = fichiersServeur.find(f => f.nom === genere.nomFichier || f.id.includes(genere.nomFichier.replace(/[^a-zA-Z0-9]/g, '_')));
    if (!fichier) return;
    const base = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    const token = localStorage.getItem('fidea_token');
    const url = `${base}/api/fichiers/${dossier.id}/fichier/documents_generes/${fichier.id}`;
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fichier.nom;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="card">
      <div className="card-header"><h3>Documents Word</h3></div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DOCS_CONFIG.map(doc => {
          const Icone = doc.icone;
          const peutGenerer = roleNiveau >= ROLES_NIVEAU[doc.roleMin];
          const genere = docsGeneres[doc.id];
          const enChargement = chargements[doc.id];

          return (
            <div key={doc.id} style={{
              border: `1.5px solid ${doc.danger ? '#fee2e2' : genere ? '#bbf7d0' : 'var(--gray-200)'}`,
              borderRadius: 8,
              background: genere ? '#f0fdf4' : doc.danger ? '#fff8f8' : 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: doc.danger ? '#fee2e2' : genere ? '#d1fae5' : 'var(--navy-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icone size={14} color={doc.danger ? '#ef4444' : genere ? '#10b981' : 'var(--navy)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: doc.danger ? '#ef4444' : 'var(--gray-800)' }}>{doc.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    {genere ? (
                      <><CheckCircle size={10} color="#10b981" /> Généré le {format(new Date(genere.genereLe), 'dd MMM yyyy', { locale: fr })} par {genere.generePar}</>
                    ) : (
                      <><Clock size={10} /> {peutGenerer ? 'Non encore généré' : `Réservé : ${ROLES[doc.roleMin]?.label}`}</>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {/* Voir — tous les rôles si déjà généré */}
                  {genere && (
                    <button onClick={() => voirDocument(doc)} title="Télécharger"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Download size={14} />
                    </button>
                  )}
                  {/* Générer — senior/expert seulement */}
                  {peutGenerer && (
                    <button onClick={() => handleGenerer(doc)} disabled={enChargement} title={genere ? 'Re-générer' : 'Générer'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: doc.danger ? '#ef4444' : 'var(--navy)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', opacity: enChargement ? 0.5 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      {enChargement ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
