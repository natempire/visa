import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Eye, Download, X, Loader, FolderOpen } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';
import { api } from '../utils/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getIcone, formatTaille } from '../utils/fileDisplay';

// contexte: 'prise_de_connaissance' | 'diligences/Clients' | etc.
export default function DocumentsManager({ dossier, contexte, titre, compact = false }) {
  const { utilisateurConnecte } = useApp();
  const [fichiers, setFichiers] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState('');
  const fileInputRef = useRef(null);

  const peutSupprimer = ROLES_NIVEAU[utilisateurConnecte?.role] >= ROLES_NIVEAU.senior;

  useEffect(() => {
    chargerFichiers();
  }, [dossier.id, contexte]);

  const chargerFichiers = async () => {
    try {
      setChargement(true);
      const data = await api.getFichiers(dossier.id, contexte);
      setFichiers(data);
    } catch (err) {
      console.error(err);
      setFichiers([]);
    } finally {
      setChargement(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setErreur('');

    const base = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    const token = localStorage.getItem('fidea_token');

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('fichier', file);
        const response = await fetch(`${base}/api/fichiers/${dossier.id}/${contexte}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json();
          setErreur(err.erreur || 'Erreur upload');
        } else {
          const nouveau = await response.json();
          setFichiers(prev => [nouveau, ...prev]);
        }
      } catch (err) {
        setErreur('Erreur : ' + err.message);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSupprimer = async (fichier) => {
    if (!window.confirm(`Supprimer "${fichier.nom}" ?`)) return;
    try {
      await api.supprimerFichier(dossier.id, contexte, fichier.id);
      setFichiers(prev => prev.filter(f => f.id !== fichier.id));
    } catch (err) {
      setErreur(err.message);
    }
  };

  const ouvrirApercu = async (fichier) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (fichier.type === 'pdf' || !imageTypes.includes(fichier.type)) {
      // Open the tab synchronously (inside the click handler) so browsers don't treat it
      // as a blocked popup, then navigate it once the short-lived token is ready — an
      // await before window.open() loses the "user gesture" that lets it bypass blockers.
      const tab = window.open('', '_blank');
      const url = await api.urlFichier(dossier.id, contexte, fichier.id);
      if (tab) tab.location.href = url;
      return;
    }

    try {
      const url = await api.urlFichier(dossier.id, contexte, fichier.id);
      const token = localStorage.getItem('fidea_token');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (!response.ok) throw new Error('Erreur chargement fichier');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setApercu({ url: blobUrl, nom: fichier.nom, type: fichier.type, blobUrl });
    } catch (err) {
      setErreur('Impossible d\'ouvrir le fichier : ' + err.message);
    }
  };

  if (compact) {
    // Compact mode for use inside diligences cycles
    return (
      <div style={{ marginTop: 10 }}>
        {erreur && <div style={{ fontSize: 11.5, color: '#ef4444', marginBottom: 6 }}>{erreur}</div>}

        {chargement ? (
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>Chargement...</div>
        ) : (
          <>
            {fichiers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {fichiers.map(fichier => {
                  const { icone: Icone, couleur, bg } = getIcone(fichier.type);
                  const previewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fichier.type);
                  return (
                    <div key={fichier.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'white' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 5, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icone size={11} color={couleur} />
                      </div>
                      <span style={{ flex: 1, fontSize: 11.5, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fichier.nom}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{formatTaille(fichier.taille)}</span>
                      <button onClick={() => ouvrirApercu(fichier)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}>
                        {previewable ? <Eye size={12} /> : <Download size={12} />}
                      </button>
                      {peutSupprimer && (
                        <button onClick={() => handleSupprimer(fichier)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2, display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#64748b', cursor: 'pointer', padding: '4px 8px', border: '1px dashed var(--gray-200)', borderRadius: 6 }}>
              {uploading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={11} />}
              {uploading ? 'Upload...' : 'Ajouter un document'}
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
            </label>
          </>
        )}

        {/* Aperçu modal */}
        {apercu && <ApercuModal apercu={apercu} onClose={() => { if (apercu.blobUrl) URL.revokeObjectURL(apercu.blobUrl); setApercu(null); }} />}
      </div>
    );
  }

  // Full card mode (for PDC sidebar)
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <FolderOpen size={14} color="var(--navy)" />
          <h3>{titre || 'Documents'}</h3>
          {fichiers.length > 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>({fichiers.length})</span>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, border: '1.5px solid var(--gray-200)', background: 'white', cursor: 'pointer', color: 'var(--navy)', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.background = 'var(--navy-pale)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = 'white'; }}
        >
          {uploading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
          {uploading ? 'Upload...' : 'Ajouter'}
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.txt" />
        </label>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {erreur && <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#ef4444', borderRadius: 8, fontSize: 12.5, marginBottom: 10 }}>{erreur}</div>}

        {chargement ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 12.5 }}>Chargement...</div>
        ) : fichiers.length === 0 ? (
          <div style={{ border: '2px dashed var(--gray-200)', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <Upload size={22} color="#cbd5e1" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: 12.5, color: '#94a3b8' }}>Cliquez pour ajouter des fichiers</div>
            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 3 }}>PDF, Word, Excel, images — max 50 Mo</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fichiers.map(fichier => {
              const { icone: Icone, couleur, bg } = getIcone(fichier.type);
              const previewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fichier.type);
              return (
                <div key={fichier.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icone size={14} color={couleur} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fichier.nom}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatTaille(fichier.taille)} · {format(new Date(fichier.dateUpload), 'dd MMM yyyy', { locale: fr })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => ouvrirApercu(fichier)} title={previewable ? 'Aperçu' : 'Télécharger'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}>
                      {previewable ? <Eye size={14} /> : <Download size={14} />}
                    </button>
                    {peutSupprimer && (
                      <button onClick={() => handleSupprimer(fichier)} title="Supprimer"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {apercu && <ApercuModal apercu={apercu} onClose={() => { if (apercu.blobUrl) URL.revokeObjectURL(apercu.blobUrl); setApercu(null); }} />}
    </div>
  );
}

function ApercuModal({ apercu, onClose }) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = apercu.url;
    a.download = apercu.nom;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', background: 'rgba(0,0,0,0.5)' }}>
        <span style={{ color: 'white', fontSize: 14, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apercu.nom}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={handleDownload} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
            <Download size={16} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {apercu.type === 'pdf'
          ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <FileText size={48} color="#ef4444" />
              <p style={{ color: 'white', fontSize: 14 }}>{apercu.nom}</p>
              <button onClick={() => window.open(apercu.url, '_blank')}
                style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Ouvrir le PDF
              </button>
            </div>
          : <img src={apercu.url} alt={apercu.nom} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }} />
        }
      </div>
     </div>    
    );
   }
