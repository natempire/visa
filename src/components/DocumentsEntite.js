import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, FileSpreadsheet, File, Image, Trash2, Eye, Download, X, Loader, ChevronDown, FolderOpen } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';
import { api } from '../utils/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CYCLES_DILIGENCES } from '../utils/diligencesData';

const ICONES_TYPE = {
  pdf: { icone: FileText, couleur: '#ef4444', bg: '#fee2e2' },
  xlsx: { icone: FileSpreadsheet, couleur: '#10b981', bg: '#d1fae5' },
  xls: { icone: FileSpreadsheet, couleur: '#10b981', bg: '#d1fae5' },
  docx: { icone: FileText, couleur: '#2563a8', bg: '#dbeafe' },
  doc: { icone: FileText, couleur: '#2563a8', bg: '#dbeafe' },
  png: { icone: Image, couleur: '#8b5cf6', bg: '#ede9fe' },
  jpg: { icone: Image, couleur: '#8b5cf6', bg: '#ede9fe' },
  jpeg: { icone: Image, couleur: '#8b5cf6', bg: '#ede9fe' },
  csv: { icone: FileSpreadsheet, couleur: '#f59e0b', bg: '#fef3c7' },
};

const SECTIONS = [
  { id: 'prise_de_connaissance', label: 'Prise de connaissance' },
  ...CYCLES_DILIGENCES.map(c => ({
    id: `diligences/${c.label.replace(/\s+/g, '_').replace(/[()\/,]/g, '').replace(/_+/g, '_')}`,
    label: c.label,
  }))
];

function formatTaille(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

function getIcone(type) {
  return ICONES_TYPE[type] || { icone: File, couleur: '#64748b', bg: '#f1f5f9' };
}

export default function DocumentsEntite({ dossier }) {
  const { utilisateurConnecte } = useApp();
  const [ouvertes, setOuvertes] = useState({ prise_de_connaissance: true });
  const [fichiers, setFichiers] = useState({});
  const [uploading, setUploading] = useState({});
  const [apercu, setApercu] = useState(null);
  const peutSupprimer = ROLES_NIVEAU[utilisateurConnecte?.role] >= ROLES_NIVEAU.senior;

  // Load all sections
  useEffect(() => {
    SECTIONS.forEach(s => chargerSection(s.id));
  }, [dossier.id]);

  const chargerSection = async (sectionId) => {
    try {
      const data = await api.getFichiers(dossier.id, sectionId);
      setFichiers(prev => ({ ...prev, [sectionId]: data }));
    } catch {
      setFichiers(prev => ({ ...prev, [sectionId]: [] }));
    }
  };

  const toggleSection = (id) => {
    setOuvertes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpload = async (sectionId, files) => {
    if (!files.length) return;
    setUploading(prev => ({ ...prev, [sectionId]: true }));
    const base = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    const token = localStorage.getItem('fidea_token');

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('fichier', file);
        const response = await fetch(`${base}/api/fichiers/${dossier.id}/${sectionId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (response.ok) {
          const nouveau = await response.json();
          setFichiers(prev => ({
            ...prev,
            [sectionId]: [nouveau, ...(prev[sectionId] || [])]
          }));
        }
      } catch (err) { console.error(err); }
    }
    setUploading(prev => ({ ...prev, [sectionId]: false }));
  };

  const handleSupprimer = async (sectionId, fichier) => {
    if (!window.confirm(`Supprimer "${fichier.nom}" ?`)) return;
    try {
      await api.supprimerFichier(dossier.id, sectionId, fichier.id);
      setFichiers(prev => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).filter(f => f.id !== fichier.id)
      }));
    } catch (err) { console.error(err); }
  };

  const ouvrirApercu = async (sectionId, fichier) => {
    const base = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    const token = localStorage.getItem('fidea_token');
    const url = `${base}/api/fichiers/${dossier.id}/fichier/${sectionId}/${fichier.id}`;
    const previewTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (previewTypes.includes(fichier.type)) {
      try {
        // Fetch with auth header to bypass ngrok warning
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          }
        });
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setApercu({ url: blobUrl, nom: fichier.nom, type: fichier.type, blobUrl });
      } catch (err) {
        console.error(err);
      }
    } else {
      // Download non-previewable files
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
      URL.revokeObjectURL(blobUrl);
    }
  };

  const totalFichiers = Object.values(fichiers).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <FolderOpen size={14} color="var(--navy)" />
          <h3>Documents de l'entité</h3>
          {totalFichiers > 0 && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>({totalFichiers})</span>
          )}
        </div>
      </div>

      <div style={{ padding: '8px 0' }}>
        {SECTIONS.map((section, idx) => {
          const sectFichiers = fichiers[section.id] || [];
          const isOpen = ouvertes[section.id];
          const isUploading = uploading[section.id];
          const fileInputId = `upload-${section.id.replace(/\//g, '-')}`;

          return (
            <div key={section.id} style={{
              borderBottom: idx < SECTIONS.length - 1 ? '1px solid var(--gray-100)' : 'none',
            }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', cursor: 'pointer' }}
                onClick={() => toggleSection(section.id)}>
                <ChevronDown size={13} color="#94a3b8" style={{ transform: isOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: 'var(--navy)' }}>{section.label}</span>
                {sectFichiers.length > 0 && (
                  <span style={{ fontSize: 10.5, color: '#94a3b8', background: 'var(--gray-100)', padding: '1px 7px', borderRadius: 10 }}>
                    {sectFichiers.length}
                  </span>
                )}
                {/* Upload button */}
                <label htmlFor={fileInputId}
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', borderRadius: 6, fontSize: 11, color: '#64748b', border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', gap: 4 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.color = 'var(--navy)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.color = '#64748b'; }}
                >
                  {isUploading ? <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={10} />}
                  {isUploading ? '...' : 'Ajouter'}
                </label>
                <input id={fileInputId} type="file" multiple style={{ display: 'none' }}
                  onChange={e => { handleUpload(section.id, e.target.files); e.target.value = ''; }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.txt" />
              </div>

              {/* Files list */}
              {isOpen && (
                <div style={{ padding: '0 16px 10px' }}>
                  {sectFichiers.length === 0 ? (
                    <label htmlFor={fileInputId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', border: '1.5px dashed var(--gray-200)', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, color: '#94a3b8' }}>
                      <Upload size={12} /> Aucun document — cliquer pour ajouter
                    </label>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {sectFichiers.map(fichier => {
                        const { icone: Icone, couleur, bg } = getIcone(fichier.type);
                        const previewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fichier.type);
                        return (
                          <div key={fichier.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white' }}>
                            <div style={{ width: 26, height: 26, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icone size={12} color={couleur} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fichier.nom}>
                                {fichier.nom}
                              </div>
                              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                                {formatTaille(fichier.taille)} · {format(new Date(fichier.dateUpload), 'dd MMM', { locale: fr })}
                              </div>
                            </div>
                            {/* Aperçu */}
                            <button onClick={() => ouvrirApercu(section.id, fichier)}
                              title={previewable ? 'Aperçu' : 'Télécharger'}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 3, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--navy)'}
                              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                            >
                              {previewable ? <Eye size={13} /> : <Download size={13} />}
                            </button>
                            {/* Supprimer */}
                            {peutSupprimer && (
                              <button onClick={() => handleSupprimer(section.id, fichier)}
                                title="Supprimer"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 3, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal aperçu plein écran */}
      {apercu && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', flexDirection: 'column' }} onClick={() => {
          if (apercu?.blobUrl) URL.revokeObjectURL(apercu.blobUrl);
          setApercu(null);
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>{apercu.nom}</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <a href={apercu.url} download={apercu.nom} style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <Download size={16} />
              </a>
              <button onClick={() => setApercu(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => e.stopPropagation()}>
            {apercu.type === 'pdf'
              ? <iframe src={apercu.url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }} title={apercu.nom} />
              : <img src={apercu.url} alt={apercu.nom} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }} />
            }
          </div>
        </div>
      )}
    </div>
  );
}
