import React, { useState } from 'react';
import { CheckCircle, XCircle, MinusCircle, Circle, Plus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DOCUMENTS_REQUIS } from '../utils/diligencesData';

const STATUTS_DOC = {
  ok: { label: 'Reçu', couleur: '#10b981', bg: '#f0fdf4', icone: CheckCircle },
  non_disponible: { label: 'Non disponible', couleur: '#ef4444', bg: '#fff1f2', icone: XCircle },
  non_applicable: { label: 'N/A', couleur: '#94a3b8', bg: '#f1f5f9', icone: MinusCircle },
};

export default function DemandeDocuments({ dossier, peutFaire }) {
  const { mettreAJourDocument, ajouterDocumentPersonnalise, retirerDocumentPersonnalise } = useApp();
  const [nouveauDoc, setNouveauDoc] = useState('');
  const documentsRecus = dossier.documentsRecus || {};
  const documentsPersonnalises = dossier.documentsRequisPersonnalises || [];
  const documentsListe = [...DOCUMENTS_REQUIS, ...documentsPersonnalises];

  const comptes = Object.values(documentsRecus);
  const nbRecus = comptes.filter(s => s === 'ok').length;
  const nbTotal = documentsListe.length;

  const ajouter = () => {
    if (!nouveauDoc.trim()) return;
    ajouterDocumentPersonnalise(dossier.id, nouveauDoc.trim());
    setNouveauDoc('');
  };

  const cycler = (docId) => {
    if (!peutFaire) return;
    const current = documentsRecus[docId];
    const ordre = [undefined, 'ok', 'non_disponible', 'non_applicable'];
    const idx = ordre.indexOf(current);
    const next = ordre[(idx + 1) % ordre.length];
    mettreAJourDocument(dossier.id, docId, next);
  };

  return (
    <div>
      {/* Résumé */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
        background: '#f8fafc', borderRadius: 10, marginBottom: 16,
        border: '1px solid var(--gray-200)'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
            {nbRecus} / {nbTotal} documents reçus
          </div>
          <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 2, marginTop: 6 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${Math.round((nbRecus / nbTotal) * 100)}%`,
              background: 'linear-gradient(90deg, var(--navy), var(--gold))',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11.5 }}>
          {Object.entries(STATUTS_DOC).map(([key, val]) => {
            const count = comptes.filter(s => s === key).length;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, color: val.couleur }}>
                <val.icone size={12} />
                <span style={{ fontWeight: 500 }}>{count}</span>
                <span style={{ color: '#94a3b8' }}>{val.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      {peutFaire && (
        <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 12, fontStyle: 'italic' }}>
          Cliquez sur un document pour changer son statut : Non reçu → Reçu → Non disponible → N/A
        </div>
      )}

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {documentsListe.map((doc, idx) => {
          const statut = documentsRecus[doc.id];
          const s = STATUTS_DOC[statut];
          const Icone = s ? s.icone : Circle;
          const estPersonnalise = doc.id.startsWith('custom_');

          return (
            <div
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                border: `1.5px solid ${s ? s.couleur + '40' : 'var(--gray-200)'}`,
                background: s ? s.bg : 'white',
                transition: 'all 0.15s',
              }}
            >
              <div
                onClick={() => cycler(doc.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: peutFaire ? 'pointer' : 'default' }}
              >
                <div style={{ width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icone size={16} color={s ? s.couleur : '#cbd5e1'} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12.5, color: statut === 'non_applicable' ? '#94a3b8' : 'var(--gray-800)', textDecoration: statut === 'non_applicable' ? 'line-through' : 'none' }}>
                    <strong style={{ color: '#94a3b8', marginRight: 6 }}>{idx + 1}.</strong>
                    {doc.nom}
                    {estPersonnalise && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6, fontStyle: 'italic' }}>(ajouté)</span>}
                  </span>
                </div>
                {s && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.couleur, flexShrink: 0 }}>
                    {s.label}
                  </span>
                )}
              </div>
              {peutFaire && estPersonnalise && (
                <button
                  onClick={() => retirerDocumentPersonnalise(dossier.id, doc.id)}
                  title="Retirer ce document de la liste"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Ajouter un document à la liste indicative */}
      {peutFaire && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            className="form-control"
            style={{ fontSize: 12.5, padding: '7px 10px' }}
            placeholder="Ajouter un document à la liste…"
            value={nouveauDoc}
            onChange={e => setNouveauDoc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ajouter()}
          />
          <button className="btn btn-outline btn-sm" onClick={ajouter}><Plus size={13} /></button>
        </div>
      )}
    </div>
  );
}
