import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { cabinet, urlLogo } from '../utils/cabinet';

export default function LoginPage() {
  const { connexion } = useApp();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    await new Promise(r => setTimeout(r, 400));
    const result = await connexion(email, motDePasse);
    if (!result.succes) setErreur(result.erreur);
    setChargement(false);
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          {cabinet.logo
            ? <img src={urlLogo()} alt={cabinet.nom} className="login-logo" />
            : <h1>{cabinet.nom}</h1>}
          {cabinet.sousTitre && <div className="tagline">{cabinet.sousTitre}</div>}
          <p>Plateforme de gestion des missions de visa de l'expert-comptable sur les états financiers annuels de synthèse.</p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Connexion</h2>
          <p>Accédez à votre espace de travail</p>

          {erreur && <div className="error-msg">{erreur}</div>}

          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input
              type="email"
              className="form-control"
              placeholder={`vous@${cabinet.domaineEmail || 'cabinet.ci'}`}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}
            disabled={chargement}
          >
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
