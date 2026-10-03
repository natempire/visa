import React, { useState } from 'react';
import { ArrowLeft, Search, FileText, FolderOpen, ClipboardCheck, BookOpen, Lock, Award, Check, ChevronRight, Download, Plus, AlertCircle, Loader, FileDown, Edit2, X } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { genererLettreMission, genererAttestation, genererRefus } from '../utils/genererDocument';
import NoteSynthese from '../components/NoteSynthese';
import ErrorBoundary from '../components/ErrorBoundary';
import DemandeDocuments from '../components/DemandeDocuments';
import NotePDC from '../components/NotePDC';
import DocumentsEntite from '../components/DocumentsEntite';
import DocumentsGeneres from '../components/DocumentsGeneres';
import DiligencesModule from '../components/DiligencesModule';
import PriseDeConnaissance from '../components/PriseDeConnaissance';
import BouclageModule from '../components/BouclageModule';

const ICONES = { Search, FileText, FolderOpen, ClipboardCheck, BookOpen, Lock, Award };

// Étapes avec leur propre composant dédié (rendu directement) plutôt que le composant
// générique EtapeGenerique — aussi utilisé pour savoir quand ne PAS afficher le bouton
// "compléter" générique (chacune de ces étapes a son propre bouton avec son propre libellé).
const ETAPES_AVEC_CONTENU_PERSONNALISE = ['prise_de_connaissance', 'demande_documents', 'diligences', 'bouclage', 'note_synthese'];

const LIBELLES_BOUTON_COMPLETER = {
  prise_de_connaissance: 'Valider la prise de connaissance',
  demande_documents: 'Valider la réception des documents',
  diligences: 'Clôturer les diligences',
  note_synthese: 'Valider la note de synthèse',
  bouclage: 'Valider le bouclage',
};

export default function DossierDetail({ dossierId, setPage }) {
  const { dossiers, utilisateurConnecte, utilisateurs, mettreAJourEtape, ETAPES, ROLES, peutAccederEtape, ajouterHistorique, retirerCollaborateur } = useApp();
  const [etapeOuverte, setEtapeOuverte] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  const dossier = dossiers.find(d => d.id === dossierId);
  if (!dossier) return null;

  const getStatutEtape = (cle) => dossier.etapes[cle]?.statut || 'non_commence';
  const peutModifier = (etapeCle) => peutAccederEtape(etapeCle, utilisateurConnecte.role);

  const marquerComplete = (cle) => {
    mettreAJourEtape(dossier.id, cle, {
      statut: 'complete', completePar: utilisateurConnecte.id, dateComplete: new Date().toISOString(),
    });
    const etape = ETAPES.find(e => e.cle === cle);
    ajouterHistorique(dossier.id, `Étape "${etape?.label}" complétée`);
  };

  const marquerEnCours = (cle) => {
    if (getStatutEtape(cle) === 'non_commence') {
      mettreAJourEtape(dossier.id, cle, { statut: 'en_cours' });
      const etape = ETAPES.find(e => e.cle === cle);
      ajouterHistorique(dossier.id, `Étape "${etape?.label}" démarrée`);
    }
  };

  const etapesCompletes = ETAPES.filter(e => ['complete', 'valide'].includes(getStatutEtape(e.cle))).length;
  const progression = Math.round((etapesCompletes / ETAPES.length) * 100);

  const startEdit = () => {
    setEditForm({
      planning: dossier.planning || '', listeDocuments: dossier.listeDocuments || '',
      nomGerant: dossier.nomGerant || '', chiffreAffaires: dossier.chiffreAffaires || '',
      totalBilan: dossier.totalBilan || '', capitauxPropres: dossier.capitauxPropres || '',
      resultatNet: dossier.resultatNet || '', totalProduits: dossier.totalProduits || '',
      montantHonoraires: dossier.montantHonoraires || '', nombreHeures: dossier.nombreHeures || '',
      nomAssistant: dossier.nomAssistant || '',
    });
    setEditMode(true);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
          <button className="btn btn-outline btn-sm" style={{ flexShrink: 0 }} onClick={() => setPage('dossiers')}>
            <ArrowLeft size={14} /> Retour
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={dossier.nomEntite}>{dossier.nomEntite}</h2>
            <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>NCC : {dossier.nccEntite} · Exercice {dossier.exercice} · Créé le {format(new Date(dossier.dateCreation), 'dd MMM yyyy', { locale: fr })}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {utilisateurConnecte.role !== 'assistant' && (
            <button className="btn btn-outline btn-sm" onClick={startEdit}><Edit2 size={13} /> Modifier les données</button>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--navy)' }}>{progression}%</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Progression</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>

          {/* Étapes workflow */}
          <div className="card">
            <div className="card-header">
              <h3>Workflow de la mission</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="progress-bar" style={{ width: 120, margin: 0 }}>
                  <div className="progress-fill" style={{ width: `${progression}%` }} />
                </div>
                <span style={{ fontSize: 12, color: '#64748b' }}>{etapesCompletes}/{ETAPES.length}</span>
              </div>
            </div>

            <div style={{ padding: '16px 24px' }}>
              <div className="etapes-list">
                {ETAPES.map((etape, idx) => {
                  const statut = getStatutEtape(etape.cle);
                  const isOuverte = etapeOuverte === etape.cle;
                  const peutFaire = peutModifier(etape.cle);
                  const isLast = idx === ETAPES.length - 1;
                  // Diligences se ferme à un niveau de rôle fixe (senior+), indépendamment de
                  // ETAPES_ROLE_MIN — toutes les autres étapes suivent la permission normale.
                  const peutCompleterEtape = etape.cle === 'diligences'
                    ? ROLES_NIVEAU[utilisateurConnecte.role] >= ROLES_NIVEAU.senior
                    : peutFaire;
                  const libelleBoutonCompleter = LIBELLES_BOUTON_COMPLETER[etape.cle] || 'Marquer comme complété';

                  return (
                    <div key={etape.cle} className="etape-item">
                      <div className="etape-timeline">
                        <div className={`etape-dot ${statut === 'non_commence' && peutFaire ? 'active' : statut}`}>
                          {(statut === 'complete' || statut === 'valide') ? <Check size={13} /> : (idx + 1)}
                        </div>
                        {!isLast && <div className="etape-line" />}
                      </div>

                      <div className="etape-content" onClick={() => {
                        setEtapeOuverte(isOuverte ? null : etape.cle);
                        if (statut === 'non_commence' && peutFaire) marquerEnCours(etape.cle);
                      }}>
                        <div className="etape-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`etape-label ${peutFaire ? 'active' : 'disabled'}`}>{etape.label}</span>
                            {!peutFaire && (
                              <span style={{ fontSize: 10, color: '#c9a84c', background: '#fff7e6', padding: '2px 6px', borderRadius: 10 }}>
                                {ROLES[etape.roleMin]?.label}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <StatutBadge statut={statut} />
                            <ChevronRight size={14} style={{ color: '#94a3b8', transform: isOuverte ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                          </div>
                        </div>

                        {isOuverte && (
                          <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                            {/* Prise de connaissance */}
                            {etape.cle === 'prise_de_connaissance' && (
                              <>
                                <PriseDeConnaissance dossier={dossier} peutFaire={peutFaire} />
                                <div style={{ marginTop: 16 }}>
                                  <NotePDC dossier={dossier} />
                                </div>
                              </>
                            )}

                            {/* Demande de documents */}
                            {etape.cle === 'demande_documents' && (
                              <DemandeDocuments dossier={dossier} peutFaire={peutFaire} />
                            )}

                            {/* Note de synthèse */}
                            {etape.cle === 'note_synthese' && (
                              <ErrorBoundary>
                                <NoteSynthese dossier={dossier} peutFaire={peutFaire} />
                              </ErrorBoundary>
                            )}

                            {/* Diligences */}
                            {etape.cle === 'diligences' && (
                              <DiligencesModule dossier={dossier} />
                            )}

                            {/* Bouclage */}
                            {etape.cle === 'bouclage' && (
                              <BouclageModule dossier={dossier} peutFaire={peutFaire} />
                            )}

                            {/* Autres étapes */}
                            {!ETAPES_AVEC_CONTENU_PERSONNALISE.includes(etape.cle) && (
                              <EtapeGenerique
                                etape={etape} dossier={dossier} statut={statut}
                                peutFaire={peutFaire}
                                onUpdate={(data) => mettreAJourEtape(dossier.id, etape.cle, data)}
                                utilisateurConnecte={utilisateurConnecte}
                              />
                            )}

                            {/* Bouton compléter */}
                            {peutCompleterEtape && statut !== 'complete' && statut !== 'valide' && (
                              <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={() => marquerComplete(etape.cle)}>
                                <Check size={13} /> {libelleBoutonCompleter}
                              </button>
                            )}

                            {dossier.etapes[etape.cle]?.dateComplete && (
                              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
                                Complété le {format(new Date(dossier.etapes[etape.cle].dateComplete), 'dd MMM yyyy', { locale: fr })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Documents générés */}
            <DocumentsGeneres dossier={dossier} />

            {/* Documents de l'entité */}
            <DocumentsEntite dossier={dossier} />

            {/* Chiffres clés */}
            <div className="card">
              <div className="card-header"><h3>Chiffres clés</h3></div>
              <div style={{ padding: '12px 20px' }}>
                {[["Chiffre d'affaires", dossier.chiffreAffaires], ['Total Bilan', dossier.totalBilan], ['Capitaux propres', dossier.capitauxPropres], ['Résultat net', dossier.resultatNet], ['Total Produits', dossier.totalProduits], ['Honoraires HT', dossier.montantHonoraires]].map(([label, val]) => val ? (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f3f8', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>{label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{Number(val).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                ) : null)}
                {!dossier.chiffreAffaires && !dossier.totalBilan && <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>Aucune donnée renseignée</div>}
              </div>
            </div>

            {/* Équipe */}
            <EquipeCard dossier={dossier} />

            {/* Historique */}
            <HistoriqueCard dossier={dossier} />
          </div>
        </div>
      </div>

      {editMode && <ModalEditDossier dossier={dossier} form={editForm} setForm={setEditForm} onClose={() => setEditMode(false)} dossierId={dossierId} />}
    </div>
  );
}

function EtapeGenerique({ etape, dossier, statut, peutFaire, onUpdate, utilisateurConnecte }) {
  const [commentaire, setCommentaire] = useState('');
  const etapeData = dossier.etapes[etape.cle] || {};

  const addCommentaire = () => {
    if (!commentaire.trim()) return;
    const commentaires = [...(etapeData.commentaires || []), { texte: commentaire, auteur: utilisateurConnecte.nom, date: new Date().toISOString() }];
    onUpdate({ commentaires });
    setCommentaire('');
  };

  return (
    <div style={{ padding: 14, background: 'var(--off-white)', borderRadius: 10, border: '1px solid var(--gray-200)' }}>
      {etape.cle === 'lettre_de_mission' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Planning d'intervention</label>
            <textarea className="form-control" style={{ fontSize: 12.5, minHeight: 56 }} placeholder="Ex : Du 20 au 30 avril 2025"
              value={etapeData.planning !== undefined ? etapeData.planning : (dossier.planning || '')}
              onChange={e => onUpdate({ planning: e.target.value })} disabled={!peutFaire} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Calendrier détaillé (tableau « Exécution et déroulement de la mission » de la lettre)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 10.5, color: '#94a3b8', display: 'block', marginBottom: 3 }}>Prise de connaissance / signature / demande de documents</label>
                <input className="form-control" style={{ fontSize: 12.5 }} placeholder="Ex : 21/04/2026"
                  value={etapeData.datePhase1 || ''} onChange={e => onUpdate({ datePhase1: e.target.value })} disabled={!peutFaire} />
              </div>
              <div>
                <label style={{ fontSize: 10.5, color: '#94a3b8', display: 'block', marginBottom: 3 }}>Mise en œuvre des diligences VISA</label>
                <input className="form-control" style={{ fontSize: 12.5 }} placeholder="Ex : 22 au 24/04/2026"
                  value={etapeData.datePhase2 || ''} onChange={e => onUpdate({ datePhase2: e.target.value })} disabled={!peutFaire} />
              </div>
              <div>
                <label style={{ fontSize: 10.5, color: '#94a3b8', display: 'block', marginBottom: 3 }}>Transmission de la note de synthèse</label>
                <input className="form-control" style={{ fontSize: 12.5 }} placeholder="Ex : 27/04/2026"
                  value={etapeData.datePhase3 || ''} onChange={e => onUpdate({ datePhase3: e.target.value })} disabled={!peutFaire} />
              </div>
              <div>
                <label style={{ fontSize: 10.5, color: '#94a3b8', display: 'block', marginBottom: 3 }}>Transmission du rapport VISA</label>
                <input className="form-control" style={{ fontSize: 12.5 }} placeholder="Ex : 30/04/2026"
                  value={etapeData.datePhase4 || ''} onChange={e => onUpdate({ datePhase4: e.target.value })} disabled={!peutFaire} />
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Liste des documents requis</label>
            <textarea className="form-control" style={{ fontSize: 12.5, minHeight: 80 }} placeholder={"- États financiers annuels\n- Grand livre\n- Balance générale"}
              value={etapeData.listeDocuments !== undefined ? etapeData.listeDocuments : (dossier.listeDocuments || '')}
              onChange={e => onUpdate({ listeDocuments: e.target.value })} disabled={!peutFaire} />
          </div>
        </div>
      )}
      {etape.cle === 'bouclage' && (
        <div style={{ padding: 12, background: '#fff7e6', borderRadius: 8, marginBottom: 12, fontSize: 12.5, color: '#92400e' }}>
          <AlertCircle size={13} style={{ display: 'inline', marginRight: 6 }} />
          Étape réservée à l'expert-comptable. Elle valide l'ensemble du dossier avant l'émission de l'attestation ou du refus.
        </div>
      )}
      {etape.cle === 'attestation' && peutFaire && (
        <div style={{ padding: 12, background: '#e8f0fa', borderRadius: 8, marginBottom: 12, fontSize: 12.5, color: 'var(--navy)' }}>
          Utilisez les boutons "Documents Word" dans la colonne de droite pour générer l'attestation ou le refus de délivrance.
        </div>
      )}
      {(etapeData.commentaires || []).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>Commentaires</div>
          {(etapeData.commentaires || []).map((c, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'white', borderRadius: 8, marginBottom: 6, fontSize: 12.5, border: '1px solid var(--gray-200)' }}>
              <div style={{ color: 'var(--navy)', fontWeight: 500, fontSize: 11.5 }}>{c.auteur} · {format(new Date(c.date), 'dd MMM', { locale: fr })}</div>
              <div style={{ color: '#475569', marginTop: 3 }}>{c.texte}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="form-control" style={{ fontSize: 12.5, padding: '7px 10px' }} placeholder="Ajouter un commentaire…"
          value={commentaire} onChange={e => setCommentaire(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCommentaire()} />
        <button className="btn btn-outline btn-sm" onClick={addCommentaire}><Plus size={13} /></button>
      </div>
    </div>
  );
}

function BoutonGeneration({ label, icone: Icone, onGenerer, roleMin, roleActuel, danger }) {
  const [chargement, setChargement] = useState(false);
  const [statut, setStatut] = useState(null);
  const peutFaire = ROLES_NIVEAU[roleActuel] >= ROLES_NIVEAU[roleMin];

  const handleClick = async () => {
    if (!peutFaire || chargement) return;
    setChargement(true); setStatut(null);
    const result = await onGenerer();
    setChargement(false);
    setStatut(result.succes ? 'ok' : 'erreur');
    setTimeout(() => setStatut(null), 3000);
  };

  return (
    <button onClick={handleClick} disabled={!peutFaire || chargement} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8,
      border: `1.5px solid ${danger ? '#fee2e2' : 'var(--gray-200)'}`,
      background: statut === 'ok' ? '#f0fdf4' : statut === 'erreur' ? '#fee2e2' : danger ? '#fff8f8' : 'white',
      cursor: peutFaire ? 'pointer' : 'not-allowed', opacity: peutFaire ? 1 : 0.5, transition: 'all 0.15s', textAlign: 'left',
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: danger ? '#fee2e2' : 'var(--navy-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {chargement ? <Loader size={14} color={danger ? '#ef4444' : 'var(--navy)'} style={{ animation: 'spin 1s linear infinite' }} /> : <Icone size={14} color={danger ? '#ef4444' : 'var(--navy)'} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: danger ? '#ef4444' : 'var(--gray-800)' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          {!peutFaire ? `Réservé : ${roleMin === 'expert' ? 'Expert-Comptable' : 'Collaborateur Senior'}` : statut === 'ok' ? '✓ Téléchargé' : statut === 'erreur' ? 'Erreur — réessayer' : 'Générer et télécharger'}
        </div>
      </div>
      {peutFaire && !chargement && <Download size={13} color="#94a3b8" />}
    </button>
  );
}

function StatutBadge({ statut }) {
  const map = { non_commence: { label: 'Non commencé', bg: '#f1f3f8', color: '#94a3b8' }, en_cours: { label: 'En cours', bg: '#fff7e6', color: '#f59e0b' }, complete: { label: 'Complété', bg: '#f0fdf4', color: '#10b981' }, valide: { label: 'Validé', bg: '#e8f0fa', color: 'var(--navy)' } };
  const s = map[statut] || map.non_commence;
  return <span className="badge" style={{ background: s.bg, color: s.color, fontSize: 11 }}>{s.label}</span>;
}

function ModalEditDossier({ dossier, form, setForm, onClose, dossierId }) {
  const { mettreAJourDossierComplet } = useApp();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => {
    await mettreAJourDossierComplet(dossierId, form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>Modifier les données du dossier</h3>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '20px 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>Chiffres clés (FCFA)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[['chiffreAffaires', "Chiffre d'affaires"], ['totalBilan', 'Total Bilan'], ['capitauxPropres', 'Capitaux propres'], ['resultatNet', 'Résultat net'], ['totalProduits', 'Total Produits'], ['montantHonoraires', 'Honoraires HT'], ['nombreHeures', 'Volume horaire']].map(([key, label]) => (
              <div className="form-group" style={{ marginBottom: 0 }} key={key}>
                <label className="form-label">{label}</label>
                <input className="form-control" type="number" value={form[key] || ''} onChange={e => set(key, e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>Équipe & Mission</div>
          <div className="form-group"><label className="form-label">Nom du gérant</label><input className="form-control" value={form.nomGerant || ''} onChange={e => set('nomGerant', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Assistant d'encadrement</label><input className="form-control" value={form.nomAssistant || ''} onChange={e => set('nomAssistant', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Planning d'intervention</label><textarea className="form-control" value={form.planning || ''} onChange={e => set('planning', e.target.value)} placeholder="Ex : Du 20 au 30 avril 2025" /></div>
          <div className="form-group"><label className="form-label">Liste des documents requis</label><textarea className="form-control" style={{ minHeight: 100 }} value={form.listeDocuments || ''} onChange={e => set('listeDocuments', e.target.value)} placeholder={"- États financiers annuels\n- Grand livre\n- Balance générale"} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function EquipeCard({ dossier }) {
  const { utilisateurs, utilisateurConnecte, ajouterCollaborateur, retirerCollaborateur, ROLES } = useApp();
  const [showAjouter, setShowAjouter] = useState(false);
  const isChef = ROLES_NIVEAU[utilisateurConnecte?.role] >= ROLES_NIVEAU.senior;

  const membresActuels = dossier.collaborateurs || [];
  const disponibles = utilisateurs.filter(u => !membresActuels.includes(u.id));

  return (
    <div className="card">
      <div className="card-header">
        <h3>Équipe</h3>
        {isChef && disponibles.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => setShowAjouter(!showAjouter)}>
            <Plus size={12} /> Ajouter
          </button>
        )}
      </div>
      <div style={{ padding: '12px 20px' }}>
        {membresActuels.map(uid => {
          const u = utilisateurs.find(u => u.id === uid);
          if (!u) return null;
          return (
            <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>{u.initiales}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.nom}>{u.nom}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{ROLES[u.role]?.label}</div>
              </div>
              {uid === utilisateurConnecte?.id
                ? <span style={{ fontSize: 10, color: '#94a3b8' }}>moi</span>
                : isChef && (
                  <button
                    onClick={() => retirerCollaborateur(dossier.id, uid)}
                    title="Retirer de l'équipe"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                  >
                    <X size={13} />
                  </button>
                )
              }
            </div>
          );
        })}

        {showAjouter && disponibles.length > 0 && (
          <div style={{ marginTop: 10, padding: 10, background: 'var(--off-white)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>Ajouter un collaborateur</div>
            {disponibles.map(u => (
              <div key={u.id}
                onClick={() => { ajouterCollaborateur(dossier.id, u.id); setShowAjouter(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--navy-pale)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{u.initiales}</div>
                <div>
                  <div style={{ fontWeight: 500 }}>{u.nom}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{ROLES[u.role]?.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoriqueCard({ dossier }) {
  const historique = [...(dossier.historique || [])].reverse().slice(0, 10);

  if (historique.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <h3>Historique</h3>
      </div>
      <div style={{ padding: '8px 16px' }}>
        {historique.map((h, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '7px 0',
            borderBottom: i < historique.length - 1 ? '1px solid #f1f5f9' : 'none',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--navy)',
              flexShrink: 0, marginTop: 6,
            }} />
            <div>
              <div style={{ fontSize: 12, color: '#1e293b' }}>{h.action}</div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                {h.auteur} · {format(new Date(h.date), 'dd MMM yyyy HH:mm', { locale: fr })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
