import React, { useState } from 'react';
import { Plus, FolderOpen, Search, Calendar, Hash, Copy, X, Trash2 } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ModalNouveauDossier from '../components/ModalNouveauDossier';

export default function DossiersPage({ setPage, setDossierActif }) {
  const { dossiers, utilisateurConnecte, creerDossier, dupliquerDossier, supprimerDossier, ETAPES } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [dossierADupliquer, setDossierADupliquer] = useState(null);
  const [nouvelExercice, setNouvelExercice] = useState('');
  const [duplicationLoading, setDuplicationLoading] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(null);

  const isAdmin = utilisateurConnecte?.role === 'admin';

  const isExpert = ROLES_NIVEAU[utilisateurConnecte?.role] >= ROLES_NIVEAU.expert;
  const mesDossiers = isExpert
    ? dossiers
    : dossiers.filter(d => (d.collaborateurs || []).includes(utilisateurConnecte.id));

  const getProgression = (dossier) => {
    const etapesCompletes = ETAPES.filter(e =>
      ['complete', 'valide'].includes(dossier.etapes[e.cle]?.statut)
    ).length;
    return Math.round((etapesCompletes / ETAPES.length) * 100);
  };

  const getEtapeActuelleLabel = (dossier) => {
    for (const etape of ETAPES) {
      if (dossier.etapes[etape.cle]?.statut === 'en_cours') return etape.label;
      if (dossier.etapes[etape.cle]?.statut === 'non_commence') return etape.label;
    }
    return 'Terminé';
  };

  const getBadgeStatut = (dossier) => {
    const prog = getProgression(dossier);
    if (prog === 100) return { label: 'Terminé', bg: '#f0fdf4', color: '#10b981' };
    if (prog > 0) return { label: 'En cours', bg: '#fff7e6', color: '#f59e0b' };
    return { label: 'Non commencé', bg: '#f1f3f8', color: '#94a3b8' };
  };

  const dossiersFiltres = mesDossiers.filter(d => {
    const matchRecherche = d.nomEntite.toLowerCase().includes(recherche.toLowerCase()) ||
      d.nccEntite.toLowerCase().includes(recherche.toLowerCase());
    const prog = getProgression(d);
    const matchFiltre = filtre === 'tous' ||
      (filtre === 'en_cours' && prog > 0 && prog < 100) ||
      (filtre === 'termine' && prog === 100) ||
      (filtre === 'non_commence' && prog === 0);
    return matchRecherche && matchFiltre;
  });

  const handleDupliquer = async () => {
    if (!nouvelExercice.trim()) return;
    setDuplicationLoading(true);
    try {
      const nouveau = await dupliquerDossier(dossierADupliquer, nouvelExercice.trim());
      setDossierADupliquer(null);
      setNouvelExercice('');
      setDossierActif(nouveau.id);
      setPage('dossier-detail');
    } catch (err) {
      console.error(err);
    } finally {
      setDuplicationLoading(false);
    }
  };

  const handleSupprimer = async (dossier, e) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer définitivement le dossier "${dossier.nomEntite}" (${dossier.exercice}) ? Toutes ses données et tous ses documents seront perdus. Cette action est irréversible.`)) return;
    setSuppressionEnCours(dossier.id);
    try {
      await supprimerDossier(dossier.id);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erreur lors de la suppression');
    } finally {
      setSuppressionEnCours(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dossiers VISA</h2>
          <p>{mesDossiers.length} dossier{mesDossiers.length > 1 ? 's' : ''} au total</p>
        </div>
        {ROLES_NIVEAU[utilisateurConnecte.role] >= ROLES_NIVEAU.senior && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Nouveau dossier
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Filtres */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              className="form-control"
              style={{ paddingLeft: 36 }}
              placeholder="Rechercher une entité, NCC…"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
            />
          </div>
          {[
            { key: 'tous', label: 'Tous' },
            { key: 'en_cours', label: 'En cours' },
            { key: 'non_commence', label: 'Non commencé' },
            { key: 'termine', label: 'Terminés' },
          ].map(f => (
            <button
              key={f.key}
              className={`btn btn-sm ${filtre === f.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFiltre(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {dossiersFiltres.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={48} />
            <h3>{recherche ? 'Aucun résultat' : 'Aucun dossier'}</h3>
            <p>{recherche ? `Aucun dossier ne correspond à "${recherche}"` : 'Créez votre premier dossier VISA.'}</p>
            {!recherche && ROLES_NIVEAU[utilisateurConnecte.role] >= ROLES_NIVEAU.senior && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={15} /> Nouveau dossier
              </button>
            )}
          </div>
        ) : (
          <div className="dossiers-grid">
            {dossiersFiltres.map(dossier => {
              const prog = getProgression(dossier);
              const badge = getBadgeStatut(dossier);
              return (
                <div key={dossier.id} className="dossier-card"
                  onClick={() => { setDossierActif(dossier.id); setPage('dossier-detail'); }}>
                  <div className="dossier-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dossier-nom" title={dossier.nomEntite}>{dossier.nomEntite}</div>
                      <div className="dossier-meta">
                        <span><Hash size={11} />{dossier.nccEntite}</span>
                        <span><Calendar size={11} />Ex. {dossier.exercice}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      {ROLES_NIVEAU[utilisateurConnecte.role] >= ROLES_NIVEAU.senior && (
                        <button
                          onClick={e => { e.stopPropagation(); setDossierADupliquer(dossier); setNouvelExercice(''); }}
                          title="Dupliquer pour un nouvel exercice"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--navy)'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <Copy size={11} /> Dupliquer
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={e => handleSupprimer(dossier, e)}
                          disabled={suppressionEnCours === dossier.id}
                          title="Supprimer définitivement"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <Trash2 size={11} /> {suppressionEnCours === dossier.id ? 'Suppression…' : 'Supprimer'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 10 }}>
                    <strong style={{ color: '#1a3a5c' }}>Étape :</strong> {getEtapeActuelleLabel(dossier)}
                  </div>

                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${prog}%` }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: '#94a3b8' }}>
                    <span>{prog}% complété</span>
                    <span>{format(new Date(dossier.dateCreation), 'dd MMM yyyy', { locale: fr })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal duplication */}
      {dossierADupliquer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDossierADupliquer(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Dupliquer le dossier</h3>
              <button className="btn-close" onClick={() => setDossierADupliquer(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 28px' }}>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Dupliquer <strong>{dossierADupliquer.nomEntite}</strong> pour un nouvel exercice. Les données de base seront copiées, le workflow sera vide.
              </p>
              <div className="form-group">
                <label className="form-label">Nouvel exercice</label>
                <input
                  className="form-control"
                  placeholder="Ex : 2025"
                  value={nouvelExercice}
                  onChange={e => setNouvelExercice(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDupliquer()}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDossierADupliquer(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleDupliquer} disabled={!nouvelExercice.trim() || duplicationLoading}>
                {duplicationLoading ? 'Duplication...' : 'Dupliquer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ModalNouveauDossier onClose={() => setShowModal(false)} onCreer={(donnees) => creerDossier(donnees)} />
      )}
    </div>
  );
}
