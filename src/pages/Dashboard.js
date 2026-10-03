import React from 'react';
import { FolderOpen, Clock, CheckCircle, TrendingUp, AlertCircle, Users, Activity } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard({ setPage, setDossierActif }) {
  const { dossiers, utilisateurConnecte, ETAPES } = useApp();

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

  const enCours = mesDossiers.filter(d => getProgression(d) > 0 && getProgression(d) < 100).length;
  const termines = mesDossiers.filter(d => getProgression(d) === 100).length;
  const nonCommences = mesDossiers.filter(d => getProgression(d) === 0).length;
  const total = mesDossiers.length;

  // Dernières activités — dossiers récemment modifiés
  const dossiersRecents = [...mesDossiers]
    .sort((a, b) => {
      const lastA = a.historique?.length ? new Date(a.historique[a.historique.length - 1].date) : new Date(a.dateCreation);
      const lastB = b.historique?.length ? new Date(b.historique[b.historique.length - 1].date) : new Date(b.dateCreation);
      return lastB - lastA;
    })
    .slice(0, 6);

  // Dossiers avec activité récente (historique)
  const activitesRecentes = mesDossiers
    .filter(d => d.historique?.length)
    .flatMap(d => (d.historique || []).map(h => ({ ...h, dossier: d })))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Tableau de bord</h2>
          <p>Bienvenue, {utilisateurConnecte.nom.split(' ')[0]} · {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#e8f0fa' }}>
              <FolderOpen size={18} color="#1a3a5c" />
            </div>
            <div className="stat-card-value">{total}</div>
            <div className="stat-card-label">Total dossiers</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#fff7e6' }}>
              <Clock size={18} color="#f59e0b" />
            </div>
            <div className="stat-card-value">{enCours}</div>
            <div className="stat-card-label">En cours</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#f0fdf4' }}>
              <CheckCircle size={18} color="#10b981" />
            </div>
            <div className="stat-card-value">{termines}</div>
            <div className="stat-card-label">Terminés</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#fdf4ff' }}>
              <TrendingUp size={18} color="#9333ea" />
            </div>
            <div className="stat-card-value">
              {total > 0 ? Math.round(((enCours + termines) / total) * 100) : 0}%
            </div>
            <div className="stat-card-label">Taux d'avancement</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* Dossiers récents */}
          <div className="card">
            <div className="card-header">
              <h3>Dossiers récents</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setPage('dossiers')}>Voir tout</button>
            </div>
            {dossiersRecents.length === 0 ? (
              <div className="empty-state">
                <FolderOpen size={40} />
                <h3>Aucun dossier</h3>
                <p>Vous n'avez pas encore de dossiers assignés.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Entité</th>
                    <th>Exercice</th>
                    <th>Étape actuelle</th>
                    <th>Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiersRecents.map(dossier => {
                    const prog = getProgression(dossier);
                    return (
                      <tr key={dossier.id} style={{ cursor: 'pointer' }}
                        onClick={() => { setDossierActif(dossier.id); setPage('dossier-detail'); }}>
                        <td>
                          <div style={{ fontWeight: 500, color: '#1a3a5c' }}>{dossier.nomEntite}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{dossier.nccEntite}</div>
                        </td>
                        <td style={{ color: '#64748b' }}>31/12/{dossier.exercice}</td>
                        <td><span style={{ fontSize: 12, color: '#1e293b' }}>{getEtapeActuelleLabel(dossier)}</span></td>
                        <td style={{ minWidth: 110 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div className="progress-bar" style={{ flex: 1, margin: 0 }}>
                              <div className="progress-fill" style={{ width: `${prog}%` }} />
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b', minWidth: 28 }}>{prog}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Activités récentes */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Activity size={14} color="var(--navy)" />
                <h3>Activité récente</h3>
              </div>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {activitesRecentes.length === 0 ? (
                <div style={{ fontSize: 12.5, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                  Aucune activité récente
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {activitesRecentes.map((act, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 10, padding: '8px 0',
                      borderBottom: i < activitesRecentes.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: 'var(--navy-pale)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Activity size={12} color="var(--navy)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => { setDossierActif(act.dossier.id); setPage('dossier-detail'); }}
                          className="hoverable"
                          title={act.dossier.nomEntite}
                        >
                          {act.dossier.nomEntite}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{act.action}</div>
                        <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                          {act.auteur} · {formatDistanceToNow(new Date(act.date), { addSuffix: true, locale: fr })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
