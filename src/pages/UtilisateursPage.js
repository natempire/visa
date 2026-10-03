import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, Eye, EyeOff, Key } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';

export default function UtilisateursPage() {
  const { utilisateurs, utilisateurConnecte, creerUtilisateur, modifierUtilisateur, supprimerUtilisateur, ROLES } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [form, setForm] = useState({ nom: '', email: '', motDePasse: '', role: 'assistant' });

  const isExpert = ROLES_NIVEAU[utilisateurConnecte?.role] >= ROLES_NIVEAU.expert;
  const isAdmin = utilisateurConnecte?.role === 'admin';

  const ouvrirCreation = () => {
    setForm({ nom: '', email: '', motDePasse: '', role: 'assistant' });
    setEditUser(null);
    setErreur('');
    setShowModal(true);
  };

  const ouvrirEdition = (user) => {
    setForm({ nom: user.nom, email: user.email, motDePasse: '', role: user.role });
    setEditUser(user);
    setErreur('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setErreur('');
    try {
      if (editUser) {
        const data = { nom: form.nom, email: form.email, role: form.role };
        if (form.motDePasse) data.motDePasse = form.motDePasse;
        await modifierUtilisateur(editUser.id, data);
        setSucces('Utilisateur modifié avec succès');
      } else {
        await creerUtilisateur(form);
        setSucces('Utilisateur créé avec succès');
      }
      setShowModal(false);
      setTimeout(() => setSucces(''), 3000);
    } catch (err) {
      setErreur(err.message);
    }
  };

  const handleSupprimer = async (user) => {
    if (!window.confirm(`Désactiver le compte de ${user.nom} ?`)) return;
    try {
      await supprimerUtilisateur(user.id);
      setSucces('Compte désactivé');
      setTimeout(() => setSucces(''), 3000);
    } catch (err) {
      setErreur(err.message);
    }
  };

  const permsParRole = {
    admin: ['Tout ce que fait un Expert-Comptable', 'Déverrouiller une note PDC', 'Créer d\'autres administrateurs'],
    expert: ['Tous les dossiers', 'Toutes les étapes', 'Bouclage & Attestation', 'Gérer les utilisateurs'],
    senior: ['Créer des dossiers', 'Toutes étapes sauf Bouclage', 'Assigner les cycles'],
    assistant: ['Prise de connaissance', 'Demande documents', 'Diligences assignées'],
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Utilisateurs</h2>
          <p>{utilisateurs.length} membre{utilisateurs.length > 1 ? 's' : ''} actif{utilisateurs.length > 1 ? 's' : ''}</p>
        </div>
        {isExpert && (
          <button className="btn btn-primary" onClick={ouvrirCreation}>
            <Plus size={15} /> Nouvel utilisateur
          </button>
        )}
      </div>

      <div className="page-body">
        {succes && (
          <div style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={14} /> {succes}
          </div>
        )}

        {/* Mon compte */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3>Mon compte</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowChangePwd(true)}>
              <Key size={13} /> Changer mon mot de passe
            </button>
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="avatar lg">{utilisateurConnecte?.initiales}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }}>{utilisateurConnecte?.nom}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{utilisateurConnecte?.email}</div>
              <span className="badge" style={{ background: 'var(--navy-pale)', color: 'var(--navy)', marginTop: 6 }}>
                {ROLES[utilisateurConnecte?.role]?.label}
              </span>
            </div>
          </div>
        </div>

        {/* Liste utilisateurs */}
        <div className="card">
          <div className="card-header"><h3>Équipe FIDEA</h3></div>
          <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Permissions</th>
                {isExpert && <th></th>}
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{u.initiales}</div>
                      <span style={{ fontWeight: 500 }}>{u.nom}</span>
                      {u.id === utilisateurConnecte?.id && <span style={{ fontSize: 10, color: '#94a3b8' }}>(moi)</span>}
                    </div>
                  </td>
                  <td style={{ color: '#64748b' }}>{u.email}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--navy-pale)', color: 'var(--navy)' }}>
                      {ROLES[u.role]?.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {(permsParRole[u.role] || []).map(p => (
                        <span key={p} style={{ fontSize: 11, padding: '2px 8px', background: '#f1f3f8', borderRadius: 10, color: '#475569' }}>{p}</span>
                      ))}
                    </div>
                  </td>
                  {isExpert && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => ouvrirEdition(u)} title="Modifier">
                          <Edit2 size={12} />
                        </button>
                        {Number(u.id) !== Number(utilisateurConnecte?.id) && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleSupprimer(u)} title="Désactiver">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Modal créer/modifier */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {erreur && <div className="error-msg">{erreur}</div>}
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input className="form-control" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Prénom Nom" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-control" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@fidea.ci" />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle *</label>
                <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="assistant">Assistant / Stagiaire</option>
                  <option value="senior">Collaborateur Senior</option>
                  <option value="expert">Expert-Comptable</option>
                  {isAdmin && <option value="admin">Administrateur</option>}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{editUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-control" type={showPwd ? 'text' : 'password'} value={form.motDePasse}
                    onChange={e => setForm(f => ({ ...f, motDePasse: e.target.value }))}
                    placeholder={editUser ? '(inchangé)' : 'Minimum 6 caractères'} style={{ paddingRight: 40 }} />
                  <button onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSave}>{editUser ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal changement mot de passe */}
      {showChangePwd && <ModalChangerMdp onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}

function ModalChangerMdp({ onClose }) {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const handleSave = async () => {
    setErreur('');
    if (nouveau.length < 6) { setErreur('Minimum 6 caractères'); return; }
    try {
      const { api } = await import('../utils/api');
      await api.changerMotDePasse(ancien, nouveau);
      setSucces(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3>Changer mon mot de passe</h3>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {succes ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#10b981' }}>
              <Check size={32} style={{ margin: '0 auto 8px' }} />
              <div>Mot de passe modifié !</div>
            </div>
          ) : (
            <>
              {erreur && <div className="error-msg">{erreur}</div>}
              <div className="form-group">
                <label className="form-label">Mot de passe actuel</label>
                <input className="form-control" type="password" value={ancien} onChange={e => setAncien(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input className="form-control" type="password" value={nouveau} onChange={e => setNouveau(e.target.value)} placeholder="Minimum 6 caractères" />
              </div>
            </>
          )}
        </div>
        {!succes && (
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Modifier</button>
          </div>
        )}
      </div>
    </div>
  );
}
