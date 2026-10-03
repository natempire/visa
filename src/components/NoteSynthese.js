import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Check, ChevronDown, ChevronRight, Save, Cloud } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DocumentsManager from './DocumentsManager';

const ETATS_FINANCIERS = [
  { id: 'bilan', label: 'Bilan' },
  { id: 'compte_resultat', label: 'Compte de résultat' },
  { id: 'tableau_flux', label: 'Tableau de flux' },
  { id: 'annexes', label: 'Annexes' },
];

const POINTS_CONTROLE = [
  { id: 'coherence_globale', label: 'Cohérence globale des EF' },
  { id: 'concordance_balance', label: 'Concordance balance / EF' },
  { id: 'conformite_ohada', label: 'Conformité OHADA' },
  { id: 'vraisemblance', label: 'Vraisemblance des informations' },
  { id: 'presentation_annexes', label: 'Présentation des annexes' },
];

const RESULTATS = [
  'Satisfaisant',
  'Partiellement satisfaisant',
  'À améliorer',
  'Non satisfaisant',
];

const COULEURS_RESULTAT = {
  'Satisfaisant': { bg: '#f0fdf4', color: '#10b981', border: '#bbf7d0' },
  'Partiellement satisfaisant': { bg: '#fff7e6', color: '#f59e0b', border: '#fde68a' },
  'À améliorer': { bg: '#fff1f2', color: '#f43f5e', border: '#fecdd3' },
  'Non satisfaisant': { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
};

export default function NoteSynthese({ dossier, peutFaire }) {
  const { mettreAJourEtape } = useApp();
  const data = dossier.etapes?.note_synthese || {};

  const [sections, setSections] = useState({ etats: true, points: true, conclusion: true, annexes: true });
  const [saveStatus, setSaveStatus] = useState('idle');
  const autoSaveTimer = useRef(null);

  const update = useCallback((field, value) => {
    mettreAJourEtape(dossier.id, 'note_synthese', { [field]: value });
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      }, 400);
    }, 30000);
  }, [dossier.id, mettreAJourEtape]);

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  const handleSave = () => {
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    }, 400);
  };

  const toggleSection = (key) => setSections(s => ({ ...s, [key]: !s[key] }));

  const etatFinanciers = data.etatsFinanciers || {};
  const pointsControle = data.pointsControle || {};
  const conclusion = data.conclusion || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Section 2 — États financiers */}
      <SectionCard
        numero="2"
        titre="États financiers soumis au VISA"
        ouvert={sections.etats}
        onToggle={() => toggleSection('etats')}
      >
        <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--navy-pale)' }}>
              <th style={thStyle}>Document</th>
              <th style={{ ...thStyle, width: 160, textAlign: 'center' }}>Présent</th>
            </tr>
          </thead>
          <tbody>
            {ETATS_FINANCIERS.map(ef => {
              const val = etatFinanciers[ef.id] || 'non';
              return (
                <tr key={ef.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <td style={tdStyle}>{ef.label}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {['oui', 'non'].map(opt => (
                        <button
                          key={opt}
                          disabled={!peutFaire}
                          onClick={() => update('etatsFinanciers', { ...etatFinanciers, [ef.id]: opt })}
                          style={{
                            padding: '4px 14px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                            border: `1.5px solid ${val === opt ? (opt === 'oui' ? '#10b981' : '#ef4444') : 'var(--gray-200)'}`,
                            background: val === opt ? (opt === 'oui' ? '#f0fdf4' : '#fef2f2') : 'white',
                            color: val === opt ? (opt === 'oui' ? '#10b981' : '#ef4444') : '#94a3b8',
                            cursor: peutFaire ? 'pointer' : 'default',
                          }}
                        >
                          {opt === 'oui' ? 'Oui' : 'Non'}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </SectionCard>

      {/* Section 3 — Points de contrôle */}
      <SectionCard
        numero="3"
        titre="Points de contrôle retenus"
        ouvert={sections.points}
        onToggle={() => toggleSection('points')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {POINTS_CONTROLE.map(pc => {
            const pcData = pointsControle[pc.id] || {};
            const resultat = pcData.resultat || '';
            const couleur = COULEURS_RESULTAT[resultat] || {};
            return (
              <div key={pc.id} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>
                  {pc.label}
                </div>
                {/* Résultat */}
                <div style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>Résultat</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {RESULTATS.map(r => {
                      const c = COULEURS_RESULTAT[r];
                      const selected = resultat === r;
                      return (
                        <button
                          key={r}
                          disabled={!peutFaire}
                          onClick={() => update('pointsControle', {
                            ...pointsControle,
                            [pc.id]: { ...pcData, resultat: r }
                          })}
                          style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                            border: `1.5px solid ${selected ? c.border : 'var(--gray-200)'}`,
                            background: selected ? c.bg : 'white',
                            color: selected ? c.color : '#94a3b8',
                            cursor: peutFaire ? 'pointer' : 'default',
                          }}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Observation */}
                <div>
                  <label style={labelStyle}>Observation / Réf FT</label>
                  <textarea
                    disabled={!peutFaire}
                    value={pcData.observation || ''}
                    onChange={e => update('pointsControle', {
                      ...pointsControle,
                      [pc.id]: { ...pcData, observation: e.target.value }
                    })}
                    placeholder="Décrivez les constats et observations..."
                    style={{
                      width: '100%', minHeight: 70, fontSize: 12, lineHeight: 1.6,
                      border: '1.5px solid var(--gray-200)', borderRadius: 6,
                      padding: '8px 10px', fontFamily: 'var(--font-body)',
                      resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                      background: peutFaire ? 'white' : '#f8fafc',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Section 4 — Conclusion générale */}
      <SectionCard
        numero="4"
        titre="Conclusion générale"
        ouvert={sections.conclusion}
        onToggle={() => toggleSection('conclusion')}
      >
        <textarea
          disabled={!peutFaire}
          value={conclusion}
          onChange={e => update('conclusion', e.target.value)}
          placeholder="Rédigez la conclusion générale de la mission de VISA..."
          style={{
            width: '100%', minHeight: 120, fontSize: 12.5, lineHeight: 1.7,
            border: '1.5px solid var(--gray-200)', borderRadius: 8,
            padding: '10px 12px', fontFamily: 'var(--font-body)',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            background: peutFaire ? 'white' : '#f8fafc',
          }}
        />
      </SectionCard>

      {/* Section 5 — Annexes */}
      <SectionCard
        numero="5"
        titre="Annexes et documents de travail"
        ouvert={sections.annexes}
        onToggle={() => toggleSection('annexes')}
      >
        <DocumentsManager
          dossier={dossier}
          contexte="diligences/Annexes_note_synthese"
          titre="Annexes"
          compact={true}
        />
      </SectionCard>

      {/* Bouton sauvegarder */}
      {peutFaire && (
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: saveStatus === 'saved' ? '#10b981' : 'var(--navy)', color: 'white',
            border: 'none', cursor: 'pointer', transition: 'background 0.2s',
          }}
        >
          {saveStatus === 'saved'
            ? <><Check size={14} /> Sauvegardé</>
            : saveStatus === 'saving'
            ? <><Cloud size={14} /> Sauvegarde...</>
            : <><Save size={14} /> Sauvegarder la note</>
          }
        </button>
      )}
    </div>
  );
}

function SectionCard({ numero, titre, ouvert, onToggle, children }) {
  return (
    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: 'var(--off-white)', cursor: 'pointer', userSelect: 'none',
          borderBottom: ouvert ? '1px solid var(--gray-200)' : 'none',
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 6, background: 'var(--navy)',
          color: 'white', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {numero}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)', flex: 1 }}>{titre}</span>
        {ouvert ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
      </div>
      {ouvert && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
}

const thStyle = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11.5,
  fontWeight: 600, color: 'var(--navy)', borderBottom: '1px solid var(--gray-200)',
};

const tdStyle = {
  padding: '8px 12px', fontSize: 12.5, color: '#374151',
};

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
};
