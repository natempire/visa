import React, { useState } from 'react';
import { UserPlus, Check, ChevronDown, ChevronRight, User, Download, BookOpen, Sparkles, Loader, RotateCcw, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';
import { CYCLES_DILIGENCES } from '../utils/diligencesData';
import { TRAVAUX_PAR_POINT } from '../utils/travauxData';
import { exportDiligencesExcel } from '../utils/exportDiligences';
import { DOCUMENTS_REQUIS } from '../utils/diligencesData';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DocumentsManager from './DocumentsManager';

const REPONSES = {
  oui: { label: 'Oui', couleur: '#10b981', bg: '#f0fdf4' },
  non: { label: 'Non', couleur: '#ef4444', bg: '#fff1f2' },
  na: { label: 'N/A', couleur: '#94a3b8', bg: '#f1f5f9' },
};

export default function DiligencesModule({ dossier }) {
  const { utilisateurConnecte, utilisateurs, assignerCycle, mettreAJourReponse, signerCycleFait, signerCycleSupervise, annulerSupervisionCycle, analyserMission, analyserPointsNumeriques, accepterPropositionIA, ajouterHistorique, ROLES } = useApp();
  const [cyclesOuverts, setCyclesOuverts] = useState([]);
  const [showAssign, setShowAssign] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [analyseNumEnCours, setAnalyseNumEnCours] = useState(false);
  const [erreurAnalyse, setErreurAnalyse] = useState('');
  const [rapportAnalyse, setRapportAnalyse] = useState(null);

  const toggleCycle = (cycleId) => {
    setCyclesOuverts(prev => prev.includes(cycleId) ? prev.filter(id => id !== cycleId) : [...prev, cycleId]);
  };

  const isChefMission = ROLES_NIVEAU[utilisateurConnecte.role] >= ROLES_NIVEAU.senior;
  const cyclesAssignations = dossier.cyclesAssignations || {};
  const cyclesReponses = dossier.cyclesReponses || {};
  const documentsRecus = dossier.documentsRecus || {};
  const docsDisponibles = DOCUMENTS_REQUIS.filter(d => documentsRecus[d.id] === 'ok');

  const progressionCycle = (cycleId) => {
    const cycle = CYCLES_DILIGENCES.find(c => c.id === cycleId);
    if (!cycle) return { fait: 0, total: 0 };
    const points = cyclesReponses[cycleId]?.points || {};
    return { fait: cycle.points.filter(p => points[p.id]?.statut).length, total: cycle.points.length };
  };

  const peutTravaillerSurCycle = (cycleId) => {
    const assigneA = cyclesAssignations[cycleId];
    if (!assigneA) return isChefMission;
    return assigneA === utilisateurConnecte.id || isChefMission;
  };

  const totalPoints = CYCLES_DILIGENCES.reduce((sum, c) => sum + c.points.length, 0);
  const totalFaits = CYCLES_DILIGENCES.reduce((sum, c) => {
    const points = cyclesReponses[c.id]?.points || {};
    return sum + c.points.filter(p => points[p.id]?.statut).length;
  }, 0);
  const cyclesSupervises = CYCLES_DILIGENCES.filter(c => cyclesReponses[c.id]?.supervise).length;

  const handleExport = async () => {
    setExporting(true);
    await exportDiligencesExcel(dossier, utilisateurs);
    setExporting(false);
    ajouterHistorique(dossier.id, 'Rapport de diligences exporté (Excel)');
  };

  const missionAutomatisable = CYCLES_DILIGENCES.some(c => c.points.some(p => p.automatisation));
  const missionNumeriqueDisponible = CYCLES_DILIGENCES.some(c => c.points.some(p => p.automatisation?.type === 'numeric'));

  // Regroupe les propositions par cycle pour le rapport affiché après une analyse, avec le
  // texte du point (pas juste son id) et une séparation succès / échecs-indéterminés.
  const construireRapport = (propositions) => {
    const parCycle = {};
    propositions.forEach(p => {
      const cycle = CYCLES_DILIGENCES.find(c => c.id === p.cycleId);
      if (!parCycle[p.cycleId]) {
        parCycle[p.cycleId] = { cycleId: p.cycleId, label: cycle?.label || p.cycleId, reussis: [], echecs: [] };
      }
      const point = cycle?.points.find(pt => pt.id === p.pointId);
      const entree = { pointId: p.pointId, texte: point?.texte || p.pointId, justification: p.justification };
      (p.statut ? parCycle[p.cycleId].reussis : parCycle[p.cycleId].echecs).push(entree);
    });
    return Object.values(parCycle);
  };

  const handleAnalyser = async () => {
    setErreurAnalyse('');
    setAnalyseEnCours(true);
    try {
      const { propositions, usage } = await analyserMission(dossier.id);
      setRapportAnalyse({ cycles: construireRapport(propositions), usage });
    } catch (err) {
      setErreurAnalyse(err.message || "Erreur lors de l'analyse automatique");
    } finally {
      setAnalyseEnCours(false);
    }
  };

  const handleAnalyserNumerique = async () => {
    setErreurAnalyse('');
    setAnalyseNumEnCours(true);
    try {
      const { propositions } = await analyserPointsNumeriques(dossier.id);
      setRapportAnalyse({ cycles: construireRapport(propositions), usage: null });
    } catch (err) {
      setErreurAnalyse(err.message || "Erreur lors de la vérification numérique");
    } finally {
      setAnalyseNumEnCours(false);
    }
  };

  const fermerRapport = () => {
    setCyclesOuverts(prev => [...new Set([...prev, ...rapportAnalyse.cycles.map(c => c.cycleId)])]);
    setRapportAnalyse(null);
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid-3" style={{ gap: 10, marginBottom: 12 }}>
        <StatMini label="Points traités" valeur={`${totalFaits}/${totalPoints}`} couleur="var(--navy)" />
        <StatMini label="Cycles supervisés" valeur={`${cyclesSupervises}/${CYCLES_DILIGENCES.length}`} couleur="#10b981" />
        <StatMini label="Progression" valeur={`${totalPoints > 0 ? Math.round((totalFaits/totalPoints)*100) : 0}%`} couleur="var(--gold)" />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        {missionNumeriqueDisponible && isChefMission && (
          <button onClick={handleAnalyserNumerique} disabled={analyseNumEnCours} title="Vérification des points numériques uniquement — calcul local, gratuit, sans appel IA"
            className="btn btn-outline btn-sm" style={{ color: 'var(--navy)', borderColor: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            {analyseNumEnCours ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Calculator size={13} />}
            {analyseNumEnCours ? 'Vérification…' : 'Vérifier les points numériques'}
          </button>
        )}
        {missionAutomatisable && isChefMission && (
          <button onClick={handleAnalyser} disabled={analyseEnCours} title="Analyse automatique de tous les cycles non supervisés, en un seul passage (appel IA)"
            className="btn btn-outline btn-sm" style={{ color: 'var(--gold)', borderColor: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            {analyseEnCours ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            {analyseEnCours ? 'Analyse en cours…' : 'Analyser toutes les diligences'}
          </button>
        )}
        <button onClick={handleExport} disabled={exporting} className="btn btn-outline btn-sm" style={{ color: 'var(--navy)', borderColor: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <Download size={13} />{exporting ? 'Export…' : 'Export Excel'}
        </button>
      </div>

      {isChefMission && (
        <div style={{ padding: '10px 14px', background: '#e8f0fa', borderRadius: 8, marginBottom: 14, fontSize: 12.5, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={14} /> En tant que chef de mission, vous pouvez assigner chaque cycle à un collaborateur et superviser les travaux.
        </div>
      )}

      {erreurAnalyse && (
        <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#ef4444', borderRadius: 8, marginBottom: 14, fontSize: 12.5 }}>{erreurAnalyse}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CYCLES_DILIGENCES.map(cycle => {
          const prog = progressionCycle(cycle.id);
          const assigneId = cyclesAssignations[cycle.id];
          const assigneUser = utilisateurs.find(u => u.id === assigneId);
          const cycleData = cyclesReponses[cycle.id] || {};
          const estOuvert = cyclesOuverts.includes(cycle.id);
          const peutTravailler = peutTravaillerSurCycle(cycle.id);
          const estComplete = prog.fait === prog.total && prog.total > 0;
          const estSupervise = !!cycleData.supervise;
          const faitParUser = utilisateurs.find(u => u.id === cycleData.faitPar);
          const superviseParUser = utilisateurs.find(u => u.id === cycleData.supervise);

          return (
            <div key={cycle.id} style={{ border: `1.5px solid ${estSupervise ? '#10b98140' : estComplete ? '#c9a84c40' : 'var(--gray-200)'}`, borderRadius: 10, background: estSupervise ? '#f0fdf4' : 'white', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleCycle(cycle.id)}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: estSupervise ? '#10b981' : estComplete ? '#c9a84c' : assigneId ? 'var(--navy-pale)' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {estSupervise ? <Check size={13} color="white" /> : estComplete ? <Check size={13} color="var(--navy)" /> : <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{prog.fait}/{prog.total}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{cycle.label}</span>
                    {assigneId === utilisateurConnecte.id && !isChefMission && <span style={{ fontSize: 10, background: '#e8f0fa', color: 'var(--navy)', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>Assigné à moi</span>}
                    {estSupervise && <span style={{ fontSize: 10, background: '#f0fdf4', color: '#10b981', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>Supervisé ✓</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3 }}>
                    <div style={{ width: 80, height: 3, background: 'var(--gray-200)', borderRadius: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${prog.total ? (prog.fait/prog.total)*100 : 0}%`, background: estSupervise ? '#10b981' : 'var(--navy)', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{prog.fait}/{prog.total} points</span>
                    {assigneUser ? <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}><User size={10}/> {assigneUser.nom.split(' ')[0]}</span> : <span style={{ fontSize: 11, color: '#f59e0b' }}>Non assigné</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                  {isChefMission && (
                    <div style={{ position: 'relative' }}>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setShowAssign(showAssign === cycle.id ? null : cycle.id)}>
                        <UserPlus size={11} /> Assigner
                      </button>
                      {showAssign === cycle.id && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 50, minWidth: 180, overflow: 'hidden' }}>
                          {utilisateurs.filter(u => (dossier.collaborateurs || []).includes(u.id)).map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', background: assigneId === u.id ? 'var(--navy-pale)' : 'white', fontSize: 12.5 }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--off-white)'}
                              onMouseLeave={e => e.currentTarget.style.background = assigneId === u.id ? 'var(--navy-pale)' : 'white'}
                              onClick={() => { assignerCycle(dossier.id, cycle.id, u.id); setShowAssign(null); }}>
                              <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{u.initiales}</div>
                              <div><div style={{ fontWeight: 500 }}>{u.nom}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>{ROLES[u.role]?.label}</div></div>
                              {assigneId === u.id && <Check size={12} color="var(--navy)" style={{ marginLeft: 'auto' }} />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <ChevronDown size={16} color="#94a3b8" style={{ transform: estOuvert ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </div>
              </div>

              {estOuvert && (
                <div style={{ borderTop: '1px solid var(--gray-100)', padding: 16 }}>
                  {!peutTravailler && !isChefMission ? (
                    <div style={{ padding: 12, background: '#fff7e6', borderRadius: 8, fontSize: 12.5, color: '#92400e', textAlign: 'center' }}>
                      Ce cycle est assigné à {assigneUser?.nom || 'un autre collaborateur'}.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {cycle.points.map(point => {
                          const rep = cyclesReponses[cycle.id]?.points?.[point.id] || {};
                          return (
                            <PointDiligence key={point.id} point={point} reponse={rep} docsDisponibles={docsDisponibles}
                              peutModifier={peutTravailler && !estSupervise}
                              onChange={(data) => mettreAJourReponse(dossier.id, cycle.id, point.id, data)}
                              onAccepterProposition={() => accepterPropositionIA(dossier.id, cycle.id, point.id)} />
                          );
                        })}
                      </div>
                      <div className="grid-2" style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 14, gap: 12 }}>
                        <SignatureBox label="Fait par" user={faitParUser} date={cycleData.dateFait}
                          peutSigner={!cycleData.faitPar && peutTravailler && estComplete}
                          onSigner={() => signerCycleFait(dossier.id, cycle.id, utilisateurConnecte.id)} />
                        <SignatureBox label="Supervisé par" user={superviseParUser} date={cycleData.dateSupervise}
                          peutSigner={!cycleData.supervise && isChefMission && !!cycleData.faitPar}
                          onSigner={() => signerCycleSupervise(dossier.id, cycle.id, utilisateurConnecte.id)}
                          peutAnnuler={!!cycleData.supervise && isChefMission}
                          onAnnuler={() => annulerSupervisionCycle(dossier.id, cycle.id)} isSuperviseur />
                      </div>
                      {/* Documents du cycle */}
                      <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 12, marginTop: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Documents du cycle</div>
                        <DocumentsManager dossier={dossier} contexte={`diligences/${cycle.label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_À-ɏ]/g, '').replace(/_+/g, '_')}`} compact />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rapportAnalyse && <RapportAnalyseModal rapport={rapportAnalyse} onFermer={fermerRapport} />}
    </div>
  );
}

function RapportAnalyseModal({ rapport, onFermer }) {
  const { cycles, usage } = rapport;
  const totalReussis = cycles.reduce((s, c) => s + c.reussis.length, 0);
  const totalEchecs = cycles.reduce((s, c) => s + c.echecs.length, 0);
  const total = totalReussis + totalEchecs;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFermer()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3>Résultat de l'analyse automatique</h3>
        </div>
        <div style={{ padding: '16px 28px', maxHeight: '55vh', overflowY: 'auto' }}>
          {total === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>
              Aucun point à analyser — soit tous les cycles automatisables sont déjà supervisés, soit aucun document n'a été trouvé.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                <strong style={{ color: 'var(--navy)' }}>{totalReussis}</strong> point{totalReussis > 1 ? 's' : ''} déterminé{totalReussis > 1 ? 's' : ''}
                {totalEchecs > 0 && <> · <strong style={{ color: '#ef4444' }}>{totalEchecs}</strong> en attente ou en erreur</>}
                {' '}sur {cycles.length} cycle{cycles.length > 1 ? 's' : ''}.
              </p>
              {usage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--off-white)', border: '1px solid var(--gray-200)', borderRadius: 8, marginBottom: 16, fontSize: 11.5, color: '#64748b' }}>
                  <Calculator size={12} />
                  <span>
                    Coût réel de cette analyse : <strong style={{ color: 'var(--navy)' }}>${usage.coutUSD.toFixed(3)}</strong>
                    {' '}— {usage.nbAppels} appel{usage.nbAppels > 1 ? 's' : ''} IA,
                    {' '}{usage.inputTokens.toLocaleString('fr-FR')} tokens en entrée,
                    {' '}{usage.outputTokens.toLocaleString('fr-FR')} en sortie.
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cycles.map(c => (
                  <div key={c.cycleId} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: c.echecs.length > 0 ? 8 : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{c.label}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5 }}>
                        {c.reussis.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#10b981' }}><CheckCircle2 size={12} /> {c.reussis.length}</span>}
                        {c.echecs.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#ef4444' }}><AlertTriangle size={12} /> {c.echecs.length}</span>}
                      </span>
                    </div>
                    {c.echecs.map(e => (
                      <div key={e.pointId} style={{ fontSize: 11.5, color: '#92400e', background: '#fffbeb', borderRadius: 6, padding: '6px 8px', marginTop: 4 }}>
                        {e.justification}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onFermer}>OK</button>
        </div>
      </div>
    </div>
  );
}

function PointDiligence({ point, reponse, docsDisponibles, peutModifier, onChange, onAccepterProposition }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showTravaux, setShowTravaux] = useState(false);
  const statut = reponse.statut;
  const travaux = TRAVAUX_PAR_POINT[point.id];
  const proposition = reponse.propositionIA;

  return (
    <div style={{ border: `1.5px solid ${statut === 'oui' ? '#10b98130' : statut === 'non' ? '#ef444430' : statut === 'na' ? '#94a3b830' : 'var(--gray-200)'}`, borderRadius: 8, background: statut === 'oui' ? '#f0fdf4' : statut === 'non' ? '#fff8f8' : statut === 'na' ? '#f8fafc' : 'white', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }}>
        {/* O/N/NA buttons */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 1 }}>
          {['oui', 'non', 'na'].map(val => {
            const r = REPONSES[val];
            const actif = statut === val;
            return (
              <button key={val} disabled={!peutModifier} onClick={() => onChange({ statut: actif ? null : val })}
                style={{ width: 32, height: 22, borderRadius: 4, border: `1.5px solid ${actif ? r.couleur : 'var(--gray-200)'}`, background: actif ? r.bg : 'white', color: actif ? r.couleur : '#94a3b8', fontSize: 10, fontWeight: 700, cursor: peutModifier ? 'pointer' : 'default', transition: 'all 0.1s' }}>
                {val === 'na' ? 'N/A' : val.charAt(0).toUpperCase() + val.slice(1)}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, fontSize: 12.5, color: statut === 'na' ? '#94a3b8' : 'var(--gray-800)', lineHeight: 1.5 }}>{point.texte}</div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {travaux && (
            <button onClick={() => setShowTravaux(!showTravaux)} title="Travaux à réaliser"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showTravaux ? 'var(--gold)' : '#cbd5e1', padding: 2 }}>
              <BookOpen size={13} />
            </button>
          )}
          <button onClick={() => setShowDetail(!showDetail)} title="Commentaire / référence"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: reponse.commentaire || reponse.refDoc ? 'var(--navy)' : '#cbd5e1', padding: 2 }}>
            <ChevronRight size={14} style={{ transform: showDetail ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        </div>
      </div>

      {/* Proposition IA */}
      {proposition && (
        <div style={{ borderTop: '1px solid #fde68a', padding: '10px 12px', background: '#fffbeb', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Sparkles size={13} color="var(--gold)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
              Proposition IA — à vérifier{proposition.statut ? ` : ${REPONSES[proposition.statut]?.label || proposition.statut}` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{proposition.justification}</div>
          </div>
          {peutModifier && proposition.statut && (
            <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }} onClick={onAccepterProposition}>
              <Check size={11} /> Accepter
            </button>
          )}
        </div>
      )}

      {/* Travaux à réaliser */}
      {showTravaux && travaux && (
        <div style={{ borderTop: '1px solid #fde68a', padding: '10px 12px', background: '#fffbeb' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Programme de travail</div>
          <pre style={{ fontSize: 11.5, color: '#78350f', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{travaux}</pre>
        </div>
      )}

      {/* Commentaire + doc ref */}
      {showDetail && (
        <div style={{ borderTop: '1px solid var(--gray-100)', padding: '10px 12px', background: 'var(--off-white)', display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Commentaire / Réf. FT</label>
            <input className="form-control" style={{ fontSize: 12, padding: '5px 8px' }}
              placeholder="Observations, référence feuille de travail…"
              value={reponse.commentaire || ''} onChange={e => onChange({ commentaire: e.target.value })} disabled={!peutModifier} />
          </div>
          {docsDisponibles.length > 0 && (
            <div style={{ minWidth: 200 }}>
              <label style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Document source</label>
              <select className="form-control" style={{ fontSize: 11.5, padding: '5px 8px' }}
                value={reponse.refDoc || ''} onChange={e => onChange({ refDoc: e.target.value })} disabled={!peutModifier}>
                <option value="">— Aucun —</option>
                {docsDisponibles.map(d => <option key={d.id} value={d.id}>{d.nom.length > 45 ? d.nom.slice(0, 45) + '…' : d.nom}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignatureBox({ label, user, date, peutSigner, onSigner, peutAnnuler, onAnnuler, isSuperviseur }) {
  const handleAnnuler = () => {
    if (window.confirm(`Annuler la supervision de ce cycle ? Les réponses resteront enregistrées mais le cycle redeviendra modifiable.`)) onAnnuler();
  };
  return (
    <div style={{ padding: '10px 12px', border: `1.5px solid ${user ? (isSuperviseur ? '#10b98140' : 'var(--navy-pale)') : 'var(--gray-200)'}`, borderRadius: 8, background: user ? (isSuperviseur ? '#f0fdf4' : 'var(--navy-pale)') : 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        {peutAnnuler && (
          <button onClick={handleAnnuler} title="Annuler la supervision" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}>
            <RotateCcw size={12} />
          </button>
        )}
      </div>
      {user ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{user.initiales}</div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: isSuperviseur ? '#10b981' : 'var(--navy)' }}>{user.nom}</span>
          </div>
          {date && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr })}</div>}
        </div>
      ) : peutSigner ? (
        <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 11.5 }} onClick={onSigner}><Check size={11} /> Signer</button>
      ) : (
        <div style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>En attente</div>
      )}
    </div>
  );
}

function StatMini({ label, valeur, couleur }) {
  return (
    <div style={{ padding: '10px 14px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: couleur }}>{valeur}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
  );
}
