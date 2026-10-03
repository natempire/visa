import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DossiersPage from './pages/DossiersPage';
import DossierDetail from './pages/DossierDetail';
import UtilisateursPage from './pages/UtilisateursPage';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function AppInner() {
  const { utilisateurConnecte, deconnexion, erreurSauvegarde } = useApp();

  const [page, setPage] = useState(() => sessionStorage.getItem('fidea_page') || 'dashboard');
  const [dossierActif, setDossierActif] = useState(() => sessionStorage.getItem('fidea_dossier') || null);
  const [tokenExpire, setTokenExpire] = useState(false);
  const [sidebarOuvert, setSidebarOuvert] = useState(false);

  useEffect(() => { sessionStorage.setItem('fidea_page', page); }, [page]);
  useEffect(() => {
    if (dossierActif) sessionStorage.setItem('fidea_dossier', dossierActif);
    else sessionStorage.removeItem('fidea_dossier');
  }, [dossierActif]);

  // Gestion expiration token
  useEffect(() => {
    const handleUnauthorized = () => {
      setTokenExpire(true);
      setTimeout(() => {
        setTokenExpire(false);
        deconnexion();
      }, 3000);
    };
    window.addEventListener('fidea_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('fidea_unauthorized', handleUnauthorized);
  }, [deconnexion]);

  const naviguer = (nouvellePage, dossierId = null) => {
    setPage(nouvellePage);
    if (dossierId) setDossierActif(dossierId);
    setSidebarOuvert(false);
  };

  if (!utilisateurConnecte) return (
    <>
      <LoginPage />
      {tokenExpire && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: 'white', padding: '12px 24px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          Session expirée — reconnexion automatique...
        </div>
      )}
    </>
  );

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard setPage={naviguer} setDossierActif={setDossierActif} />;
      case 'dossiers': return <DossiersPage setPage={naviguer} setDossierActif={setDossierActif} />;
      case 'dossier-detail': return <DossierDetail dossierId={dossierActif} setPage={naviguer} />;
      case 'utilisateurs': return <UtilisateursPage />;
      default: return <Dashboard setPage={naviguer} setDossierActif={setDossierActif} />;
    }
  };

  return (
    <div className="app-shell">
      {erreurSauvegarde && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#991b1b', color: 'white', padding: '10px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          ⚠ {erreurSauvegarde}
        </div>
      )}
      {tokenExpire && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: 'white', padding: '12px 24px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          Session expirée — reconnexion dans 3 secondes...
        </div>
      )}
      {!sidebarOuvert && (
        <button className="sidebar-toggle" onClick={() => setSidebarOuvert(true)} aria-label="Ouvrir le menu">
          <Menu size={18} />
        </button>
      )}
      <div className={`sidebar-overlay ${sidebarOuvert ? 'open' : ''}`} onClick={() => setSidebarOuvert(false)} />
      <Sidebar page={page} setPage={naviguer} ouvert={sidebarOuvert} onFermer={() => setSidebarOuvert(false)} />
      <main className="main-content">
        <ErrorBoundary key={page}>
          {renderPage()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
