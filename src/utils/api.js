const API_URL = process.env.REACT_APP_API_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

function getToken() {
  return localStorage.getItem('fidea_token');
}

async function request(method, path, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_URL}${path}`, options);
  if (response.status === 401) {
  if (!path.includes('/auth/connexion')) {
    window.dispatchEvent(new Event('fidea_unauthorized'));
    throw new Error('Session expirée');
  }
  throw new Error('Email ou mot de passe incorrect');
}
  const data = await response.json();
  if (!response.ok) throw new Error(data.erreur || 'Erreur serveur');
  return data;
}

export const api = {
  // Auth
  connexion: (email, motDePasse) =>
    request('POST', '/api/auth/connexion', { email, motDePasse }),
  changerMotDePasse: (ancienMotDePasse, nouveauMotDePasse) =>
    request('POST', '/api/auth/changer-mot-de-passe', { ancienMotDePasse, nouveauMotDePasse }),

  // Utilisateurs
  getUtilisateurs: () => request('GET', '/api/utilisateurs'),
  creerUtilisateur: (data) => request('POST', '/api/utilisateurs', data),
  modifierUtilisateur: (id, data) => request('PUT', `/api/utilisateurs/${id}`, data),
  supprimerUtilisateur: (id) => request('DELETE', `/api/utilisateurs/${id}`),

  // Dossiers
  getDossiers: () => request('GET', '/api/dossiers'),
  getDossier: (id) => request('GET', `/api/dossiers/${id}`),
  creerDossier: (data) => request('POST', '/api/dossiers', data),
  mettreAJourDossier: (id, data) => request('PUT', `/api/dossiers/${id}`, data),
  ajouterCollaborateur: (dossierId, userId) =>
    request('POST', `/api/dossiers/${dossierId}/collaborateurs`, { userId }),
  retirerCollaborateur: (dossierId, userId) =>
    request('DELETE', `/api/dossiers/${dossierId}/collaborateurs/${userId}`),

  // Fichiers — contexte: 'prise_de_connaissance', 'diligences/Clients', 'documents_generes'
  getFichiers: (dossierId, contexte) =>
    request('GET', `/api/fichiers/${dossierId}/${contexte}`),
  supprimerFichier: (dossierId, contexte, fichierId) =>
    request('DELETE', `/api/fichiers/${dossierId}/fichier/${contexte}/${fichierId}`),
  // Mints a short-lived (2 min) file-access token instead of putting the 30-day session
  // token in the URL — needed because window.open() (PDF preview in a new tab) can't send
  // an Authorization header, only a URL.
  urlFichier: async (dossierId, contexte, fichierId) => {
    const base = window.location.hostname === 'localhost'
      ? 'http://localhost:3001' : window.location.origin;
    const { token } = await request('POST', '/api/auth/jeton-fichier');
    return `${base}/api/fichiers/${dossierId}/fichier/${contexte}/${fichierId}?token=${token}`;
  },
  sauvegarderDocGenere: (dossierId, nomFichier, contenuBase64) =>
    request('POST', `/api/fichiers/${dossierId}/sauvegarder-genere`, { nomFichier, contenuBase64 }),

  // IA
  genererNotePDCIA: (nomEntite, sections) =>
    request('POST', '/api/ia/note-pdc', { nomEntite, sections }),
};
