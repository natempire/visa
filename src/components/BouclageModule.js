import React from 'react';
import { CheckCircle, XCircle, MinusCircle, Circle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { POINTS_BOUCLAGE } from '../utils/pdcData';

const STATUTS_BOUCLAGE = {
  ok: { label: 'OK', couleur: '#10b981', bg: '#f0fdf4', icone: CheckCircle },
  nok: { label: 'Non OK', couleur: '#ef4444', bg: '#fff1f2', icone: XCircle },
  na: { label: 'N/A', couleur: '#94a3b8', bg: '#f1f5f9', icone: MinusCircle },
};

export default function BouclageModule({ dossier, peutFaire }) {
  const { mettreAJourEtape } = useApp();

  const bouclageData = dossier.etapes?.bouclage?.pointsBouclage || {};

  const setPoint = (pointId, champ, valeur) => {
    if (!peutFaire) return;
    const updated = {
      ...bouclageData,
      [pointId]: { ...(bouclageData[pointId] || {}), [champ]: valeur }
    };
    mettreAJourEtape(dossier.id, 'bouclage', { pointsBouclage: updated });
  };

  const cyclerStatut = (pointId) => {
    if (!peutFaire) return;
    const current = bouclageData[pointId]?.statut;
    const ordre = [undefined, 'ok', 'nok', 'na'];
    const idx = ordre.indexOf(current);
    const next = ordre[(idx + 1) % ordre.length];
    setPoint(pointId, 'statut', next);
  };

  const nbOk = POINTS_BOUCLAGE.filter(p => bouclageData[p.id]?.statut === 'ok').length;
  const nbNok = POINTS_BOUCLAGE.filter(p => bouclageData[p.id]?.statut === 'nok').length;
  const nbTotal = POINTS_BOUCLAGE.length;

  return (
    <div>
      {/* En-tête */}
      <div style={{ padding: '12px 16px', background: '#fff7e6', border: '1.5px solid #fde68a', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <AlertCircle size={15} color="#92400e" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: '#92400e', lineHeight: 1.5 }}>
          <strong>Objectif du bouclage :</strong> S'assurer, avant la demande d'émission du visa à l'Associé, que le dossier de travail est complet et présentable lors d'un contrôle d'activité de l'OECCI.
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ gap: 10, marginBottom: 16 }}>
        <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{nbOk}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Points OK</div>
        </div>
        <div style={{ padding: '8px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{nbNok}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Points non OK</div>
        </div>
        <div style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid var(--gray-200)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>{nbTotal - nbOk - nbNok}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>En attente</div>
        </div>
      </div>

      {peutFaire && (
        <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 12, fontStyle: 'italic' }}>
          Cliquez sur un point pour changer son statut. Cliquez sur la flèche pour ajouter une observation.
        </div>
      )}

      {/* Points de bouclage */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {POINTS_BOUCLAGE.map((point, idx) => (
          <PointBouclage
            key={point.id}
            point={point}
            idx={idx}
            data={bouclageData[point.id] || {}}
            peutFaire={peutFaire}
            onCycler={() => cyclerStatut(point.id)}
            onObservation={(val) => setPoint(point.id, 'observation', val)}
          />
        ))}
      </div>

      {/* Résumé final */}
      {nbNok > 0 && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 10, fontSize: 12.5, color: '#ef4444' }}>
          <strong>{nbNok} point(s) non OK</strong> — Le dossier nécessite des corrections avant l'émission du visa.
        </div>
      )}
      {nbOk === nbTotal && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, fontSize: 12.5, color: '#10b981' }}>
          <strong>✓ Tous les points sont OK</strong> — Le dossier est prêt pour l'émission du visa.
        </div>
      )}
    </div>
  );
}

function PointBouclage({ point, idx, data, peutFaire, onCycler, onObservation }) {
  const [showObs, setShowObs] = React.useState(false);
  const statut = data.statut;
  const s = STATUTS_BOUCLAGE[statut];
  const Icone = s ? s.icone : Circle;

  return (
    <div style={{
      border: `1.5px solid ${s ? s.couleur + '50' : 'var(--gray-200)'}`,
      borderRadius: 8, background: s ? s.bg : 'white', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: peutFaire ? 'pointer' : 'default' }}
        onClick={onCycler}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: s ? s.couleur : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {s ? <Icone size={13} color="white" /> : <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</span>}
        </div>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--gray-800)', lineHeight: 1.4 }}>
          <strong style={{ color: '#94a3b8', marginRight: 6 }}>{idx + 1}.</strong>{point.texte}
        </span>
        {s && <span style={{ fontSize: 11.5, fontWeight: 600, color: s.couleur, flexShrink: 0 }}>{s.label}</span>}
        <button onClick={e => { e.stopPropagation(); setShowObs(!showObs); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: data.observation ? 'var(--navy)' : '#cbd5e1', padding: 2, flexShrink: 0 }}>
          ›
        </button>
      </div>
      {showObs && (
        <div style={{ borderTop: '1px solid var(--gray-100)', padding: '8px 14px', background: 'var(--off-white)' }}>
          <input className="form-control" style={{ fontSize: 12.5, padding: '6px 10px' }}
            placeholder="Observation…"
            value={data.observation || ''}
            onChange={e => onObservation(e.target.value)}
            disabled={!peutFaire}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
