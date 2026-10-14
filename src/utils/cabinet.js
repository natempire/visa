// Identité du cabinet de cette instance (nom, n° d'Ordre, expert par défaut...), lue une fois
// au démarrage depuis le serveur (GET /api/cabinet). Un même build de l'interface sert ainsi
// tous les cabinets : rien de propre à un cabinet n'est écrit dans le code.
import { API_URL } from './api';

export const cabinet = {
  nom: 'Cabinet',
  sousTitre: '',
  numeroOrdre: '',
  expertParDefaut: '',
  domaineEmail: '',
  logo: false,
};

export const urlLogo = () => `${API_URL}/api/cabinet/logo`;
export const urlModele = (nom) => `${API_URL}/api/cabinet/modeles/${nom}`;

export async function chargerCabinet() {
  try {
    const r = await fetch(`${API_URL}/api/cabinet`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
    if (r.ok) Object.assign(cabinet, await r.json());
  } catch (e) {
    console.error('Identité du cabinet indisponible :', e);
  }
  document.title = `${cabinet.nom} · Missions VISA`;
}
