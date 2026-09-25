import React, { useState, useEffect, useRef } from 'react';
import { Download, ChevronDown, ChevronRight, Info, AlertCircle, CheckCircle, FileSpreadsheet, Cloud, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SECTIONS_PDC } from '../utils/pdcData';
import { exportPDCExcel } from '../utils/exportPDC';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const LOCAL_KEY = (dossierId) => `fidea_pdc_${dossierId}`;

export default function PriseDeConnaissance({ dossier, peutFaire }) {
  const { mettreAJourEtape, utilisateurConnecte, ajouterHistorique } = useApp();
  const [sectionOuverte, setSectionOuverte] = useState('infos_generales');
  const [showAide, setShowAide] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const autoSaveTimer = useRef(null);

  // Load from server, but check localStorage for more recent unsaved data
  const serverData = dossier.etapes?.prise_de_connaissance?.pdcReponses || {};
  const [pdcData, setPdcData] = useState(() => {
    try {
      const local = localStorage.getItem(LOCAL_KEY(dossier.id));
      if (local) {
        const parsed = JSON.parse(local);
        // Use local if it has more data than server
        if (Object.keys(parsed).length >= Object.keys(serverData).length) {
          return parsed;
        }
      }
    } catch (e) {}
    return serverData;
  });

  const exportGenere = dossier.etapes?.prise_de_connaissance?.exportGenere || null;

  // Sync to server + localStorage on every change
  const saveToServer = async (data) => {
    setSaveStatus('saving');
    try {
      await new Promise(resolve => {
        mettreAJourEtape(dossier.id, 'prise_de_connaissance', { pdcReponses: data });
        resolve();
      });
      localStorage.setItem(LOCAL_KEY(dossier.id), JSON.stringify(data));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      // Even if server fails, localStorage is saved
      localStorage.setItem(LOCAL_KEY(dossier.id), JSON.stringify(data));
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const setReponse = (questionId, valeur) => {
    if (!peutFaire) return;
    const newData = { ...pdcData, [questionId]: valeur };
    setPdcData(newData);

    // Save to localStorage immediately
    try { localStorage.setItem(LOCAL_KEY(dossier.id), JSON.stringify(newData)); } catch (e) {}

    // Debounce server save — 3 seconds after last change
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveToServer(newData), 3000);
  };

  // Force save on unmount
  useEffect(() => {
    return () => {
      clearTimeout(autoSaveTimer.current);
      try { localStorage.setItem(LOCAL_KEY(dossier.id), JSON.stringify(pdcData)); } catch (e) {}
    };
  }, [pdcData]);

  // Check if local data differs from server (recovery notice)
  const localHasUnsaved = (() => {
    try {
      const local = localStorage.getItem(LOCAL_KEY(dossier.id));
      if (!local) return false;
      return JSON.stringify(JSON.parse(local)) !== JSON.stringify(serverData);
    } catch (e) { return false; }
  })();

  // Calcul complétion
  const obligatoires = SECTIONS_PDC.flatMap(s => s.questions.filter(q => q.obligatoire));
  const obligatoiresRemplis = obligatoires.filter(q => {
    const val = pdcData[q.id];
    if (!val) return false;
    if (typeof val === 'object') return val.reponse;
    return String(val).trim().length > 0;
  });
  const pctObligatoires = Math.round((obligatoiresRemplis.length / obligatoires.length) * 100);

  const totalQuestions = SECTIONS_PDC.flatMap(s => s.questions).length;
  const totalRemplies = SECTIONS_PDC.flatMap(s => s.questions).filter(q => {
    const val = pdcData[q.id];
    if (!val) return false;
    if (typeof val === 'object') return val.reponse;
    return String(val).trim().length > 0;
  }).length;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPDCExcel(dossier, pdcData);
      mettreAJourEtape(dossier.id, 'prise_de_connaissance', {
        exportGenere: new Date().toISOString(),
        exportPar: utilisateurConnecte.nom,
      });
      ajouterHistorique(dossier.id, 'Rapport de prise de connaissance exporté (Excel)');
    } catch (e) {
      console.error(e);
    }
    setExporting(false);
  };

  return (
    <div>
      {/* Bandeau récupération données locales */}
      {localHasUnsaved && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fff7e6', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 12.5, color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>⚠️ Des données non sauvegardées ont été récupérées localement. Vérifiez et sauvegardez.</span>
          <button onClick={() => saveToServer(pdcData)} style={{ padding: '4px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            Sauvegarder maintenant
          </button>
        </div>
      )}

      {/* Indicateur de sauvegarde */}
      {saveStatus !== 'idle' && (
        <div style={{ marginBottom: 8, padding: '6px 12px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
          background: saveStatus === 'saved' ? '#f0fdf4' : saveStatus === 'error' ? '#fef2f2' : '#f8fafc',
          color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#64748b',
        }}>
          <Cloud size={12} style={{ animation: saveStatus === 'saving' ? 'spin 1.5s linear infinite' : 'none' }} />
          {saveStatus === 'saving' ? 'Sauvegarde en cours...' : saveStatus === 'saved' ? 'Sauvegardé ✓' : '⚠ Erreur serveur — données conservées localement'}
        </div>
      )}
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: '10px 14px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Champs obligatoires</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--gray-200)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${pctObligatoires}%`, background: pctObligatoires === 100 ? '#10b981' : 'var(--navy)', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: pctObligatoires === 100 ? '#10b981' : 'var(--navy)' }}>
              {obligatoiresRemplis.length}/{obligatoires.length}
            </span>
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Questions remplies</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{totalRemplies} / {totalQuestions}</div>
        </div>
        <button
          onClick={() => setShowAide(!showAide)}
          style={{ padding: '8px 14px', background: showAide ? 'var(--navy-pale)' : 'white', border: '1.5px solid var(--gray-200)', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Info size={13} /> Aide mémoire
        </button>
      </div>

      {/* Aide mémoire */}
      {showAide && (
        <div style={{ marginBottom: 16, padding: 16, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>Aide mémoire de l'auditeur — Justificatifs à obtenir</div>
          {SECTIONS_PDC.map(section => (
            <div key={section.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>{section.numero}. {section.label}</div>
              {section.questions.map(q => (
                <div key={q.id} style={{ display: 'flex', gap: 8, fontSize: 11.5, padding: '3px 0', borderBottom: '1px solid #fde68a20' }}>
                  <span style={{ color: '#78350f', flex: 1 }}>{q.label}</span>
                  <span style={{ color: '#b45309', fontWeight: 500, minWidth: 160 }}>{q.justificatif}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {SECTIONS_PDC.map(section => {
        const isOpen = sectionOuverte === section.id;
        const reponsesSection = section.questions.filter(q => {
          const val = pdcData[q.id];
          if (!val) return false;
          if (typeof val === 'object') return val.reponse;
          return String(val).trim().length > 0;
        }).length;

        return (
          <div key={section.id} style={{ marginBottom: 8, border: '1.5px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: isOpen ? 'var(--navy-pale)' : 'white' }}
              onClick={() => setSectionOuverte(isOpen ? null : section.id)}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: reponsesSection === section.questions.length ? '#10b981' : 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {reponsesSection === section.questions.length
                  ? <CheckCircle size={14} color="white" />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{section.numero}</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }}>{section.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{reponsesSection}/{section.questions.length} questions remplies</div>
              </div>
              <ChevronDown size={15} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </div>

            {isOpen && (
              <div style={{ padding: '16px', borderTop: '1px solid var(--gray-100)' }}>
                {section.questions.map(question => (
                  <QuestionField
                    key={question.id}
                    question={question}
                    valeur={pdcData[question.id]}
                    onChange={(v) => setReponse(question.id, v)}
                    disabled={!peutFaire}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Export */}
      <div style={{ marginTop: 16, padding: '14px 16px', background: 'white', border: '1.5px solid var(--gray-200)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Rapport de prise de connaissance</div>
          {exportGenere ? (
            <div style={{ fontSize: 11.5, color: '#10b981', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={11} /> Déjà généré le {format(new Date(exportGenere), 'dd MMM yyyy à HH:mm', { locale: fr })}
              {dossier.etapes?.prise_de_connaissance?.exportPar && ` par ${dossier.etapes.prise_de_connaissance.exportPar}`}
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>Non encore généré</div>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !peutFaire}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--navy)', borderColor: 'var(--navy)' }}
        >
          {exporting ? 'Génération…' : <><FileSpreadsheet size={13} /> {exportGenere ? 'Re-générer' : 'Générer Excel'}</>}
        </button>
      </div>
    </div>
  );
}

function QuestionField({ question, valeur, onChange, disabled }) {
  const isEmpty = !valeur || (typeof valeur === 'object' ? !valeur.reponse : String(valeur).trim().length === 0);

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: 'var(--gray-800)', marginBottom: 6, lineHeight: 1.4 }}>
        {question.obligatoire && isEmpty && (
          <span style={{ color: '#ef4444', fontSize: 13, flexShrink: 0, marginTop: 1 }}>*</span>
        )}
        {question.obligatoire && !isEmpty && (
          <span style={{ color: '#10b981', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
        )}
        {!question.obligatoire && <span style={{ width: 13, flexShrink: 0 }} />}
        <span>{question.label}</span>
      </label>

      <div style={{ paddingLeft: 19 }}>
        {/* Justificatif hint */}
        <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 5, fontStyle: 'italic' }}>
          Justificatif : {question.justificatif}
        </div>

        {question.type === 'text' && (
          <input className="form-control" style={{ fontSize: 13 }} value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder="Réponse du client…" />
        )}

        {question.type === 'textarea' && (
          <textarea className="form-control" style={{ fontSize: 13, minHeight: 70 }} value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder="Réponse du client…" />
        )}

        {question.type === 'date' && (
          <input type="date" className="form-control" style={{ fontSize: 13, maxWidth: 200 }} value={valeur || ''} onChange={e => onChange(e.target.value)} disabled={disabled} />
        )}

        {question.type === 'select' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {question.options.map(opt => (
              <button key={opt} onClick={() => !disabled && onChange(opt)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12.5, cursor: disabled ? 'default' : 'pointer',
                border: `1.5px solid ${valeur === opt ? 'var(--navy)' : 'var(--gray-200)'}`,
                background: valeur === opt ? 'var(--navy)' : 'white',
                color: valeur === opt ? 'white' : 'var(--gray-800)',
                transition: 'all 0.1s',
              }}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.type === 'oui_non' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {['Oui', 'Non'].map(opt => (
              <button key={opt} onClick={() => !disabled && onChange(opt)} style={{
                padding: '5px 20px', borderRadius: 20, fontSize: 12.5, cursor: disabled ? 'default' : 'pointer',
                border: `1.5px solid ${valeur === opt ? (opt === 'Oui' ? '#10b981' : '#ef4444') : 'var(--gray-200)'}`,
                background: valeur === opt ? (opt === 'Oui' ? '#f0fdf4' : '#fff1f2') : 'white',
                color: valeur === opt ? (opt === 'Oui' ? '#10b981' : '#ef4444') : 'var(--gray-600)',
                fontWeight: valeur === opt ? 600 : 400,
              }}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.type === 'oui_non_detail' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: (valeur?.reponse) ? 8 : 0 }}>
              {['Oui', 'Non'].map(opt => (
                <button key={opt} onClick={() => !disabled && onChange({ ...(valeur || {}), reponse: opt })} style={{
                  padding: '5px 20px', borderRadius: 20, fontSize: 12.5, cursor: disabled ? 'default' : 'pointer',
                  border: `1.5px solid ${valeur?.reponse === opt ? (opt === 'Oui' ? '#10b981' : '#ef4444') : 'var(--gray-200)'}`,
                  background: valeur?.reponse === opt ? (opt === 'Oui' ? '#f0fdf4' : '#fff1f2') : 'white',
                  color: valeur?.reponse === opt ? (opt === 'Oui' ? '#10b981' : '#ef4444') : 'var(--gray-600)',
                  fontWeight: valeur?.reponse === opt ? 600 : 400,
                }}>
                  {opt}
                </button>
              ))}
            </div>
            {valeur?.reponse && (
              <textarea className="form-control" style={{ fontSize: 12.5, minHeight: 60, marginTop: 6 }}
                placeholder="Précisions / détails…"
                value={valeur?.detail || ''}
                onChange={e => onChange({ ...(valeur || {}), detail: e.target.value })}
                disabled={disabled}
              />
            )}
          </div>
        )}

        {/* Champ commentaire EC */}
        <div style={{ marginTop: 6 }}>
          <input className="form-control" style={{ fontSize: 11.5, padding: '5px 10px', background: '#fffbeb', borderColor: '#fde68a' }}
            placeholder="Commentaire EC (optionnel)…"
            value={(typeof valeur === 'object' ? valeur?.commentaire : undefined) || (typeof valeur === 'string' ? '' : '')}
            onChange={e => {
              if (typeof valeur === 'object') {
                onChange({ ...(valeur || {}), commentaire: e.target.value });
              } else {
                onChange({ reponse: valeur, commentaire: e.target.value });
              }
            }}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
