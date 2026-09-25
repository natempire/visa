import React from 'react';
import { LayoutDashboard, FolderOpen, Users, LogOut, Cloud } from 'lucide-react';
import { useApp, ROLES_NIVEAU } from '../context/AppContext';

export default function Sidebar({ page, setPage }) {
  const { utilisateurConnecte, deconnexion, ROLES, sauvegarde } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'dossiers', label: 'Dossiers VISA', icon: FolderOpen },
    ...(ROLES_NIVEAU[utilisateurConnecte?.role] >= ROLES_NIVEAU.expert ? [{ id: 'utilisateurs', label: 'Utilisateurs', icon: Users }] : []),
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>FIDEA</h1>
        <span>Missions VISA</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {sauvegarde && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginBottom: 8, fontSize: 11.5, color: '#94a3b8' }}>
            <Cloud size={12} style={{ animation: 'spin 1.5s linear infinite' }} />
            Sauvegarde...
          </div>
        )}
        <div className="user-card">
          <div className="avatar">
            {utilisateurConnecte?.initiales}
          </div>
          <div className="user-card-info">
            <strong>{utilisateurConnecte?.nom}</strong>
            <span>{ROLES[utilisateurConnecte?.role]?.label}</span>
          </div>
          <button className="btn-logout" onClick={deconnexion} title="Déconnexion">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
