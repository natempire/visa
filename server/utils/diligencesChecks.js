const fs = require('fs');
const XLSX = require('xlsx');

const TOLERANCE = 1; // unité monétaire : écart toléré (arrondis)

function normaliser(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function nombre(val) {
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val || '0').replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Balance à colonnes Débit/Crédit pour l'ouverture et la clôture (balance "six colonnes").
// Recherche heuristique de l'en-tête : format des fichiers clients très variable, donc on
// tolère un en-tête sur une ou deux lignes fusionnées.
function parserBalance(buffer) {
  const classeur = XLSX.read(buffer, { type: 'buffer' });
  const feuille = classeur.Sheets[classeur.SheetNames[0]];
  const lignes = XLSX.utils.sheet_to_json(feuille, { header: 1, raw: true, defval: '' });

  let ligneEntete = -1;
  for (let i = 0; i < Math.min(lignes.length, 15); i++) {
    if (lignes[i].some(c => normaliser(c).includes('compte'))) { ligneEntete = i; break; }
  }
  if (ligneEntete === -1) return null;

  const ligneAvant = lignes[ligneEntete - 1] || [];
  const ligneActuelle = lignes[ligneEntete] || [];
  const nbColonnes = Math.max(ligneAvant.length, ligneActuelle.length);
  const enteteCombine = Array.from({ length: nbColonnes }, (_, idx) =>
    normaliser(ligneAvant[idx]) + ' ' + normaliser(ligneActuelle[idx])
  );
  const trouverColonne = (motsCles) =>
    enteteCombine.findIndex(txt => motsCles.every(m => txt.includes(m)));

  const colCompte = enteteCombine.findIndex(txt => txt.includes('compte'));
  const colOuvD = trouverColonne(['ouvert', 'debit']);
  const colOuvC = trouverColonne(['ouvert', 'credit']);
  const colClotD = trouverColonne(['clot', 'debit']);
  const colClotC = trouverColonne(['clot', 'credit']);

  if (colCompte === -1 || colOuvD === -1 || colOuvC === -1 || colClotD === -1 || colClotC === -1) {
    return null;
  }

  const comptes = {};
  for (let i = ligneEntete + 1; i < lignes.length; i++) {
    const ligne = lignes[i];
    const compte = String(ligne[colCompte] || '').trim();
    if (!/^\d/.test(compte)) continue;
    comptes[compte] = {
      soldeOuverture: nombre(ligne[colOuvD]) - nombre(ligne[colOuvC]),
      soldeCloture: nombre(ligne[colClotD]) - nombre(ligne[colClotC]),
    };
  }
  return Object.keys(comptes).length > 0 ? comptes : null;
}

// Compare, pour deux balances, la clôture de l'une à l'ouverture de l'autre (on ne sait pas
// à l'avance laquelle est N et laquelle est N-1), et retient le sens le plus cohérent.
function comparerSoldes(balanceA, balanceB) {
  const compare = (source, cible) => {
    const comptesCommuns = Object.keys(source).filter(c => cible[c] !== undefined);
    const ecarts = comptesCommuns
      .map(c => ({ compte: c, ecart: Math.round((source[c].soldeCloture - cible[c].soldeOuverture) * 100) / 100 }))
      .filter(e => Math.abs(e.ecart) > TOLERANCE);
    return { total: comptesCommuns.length, ecarts };
  };

  const sensAB = compare(balanceA, balanceB);
  const sensBA = compare(balanceB, balanceA);
  // Le sens correct (quel fichier est N-1 vs N) est celui qui produit le moins d'écarts :
  // dans le mauvais sens, on compare des colonnes sans rapport et les écarts explosent.
  return sensAB.ecarts.length <= sensBA.ecarts.length ? sensAB : sensBA;
}

function soldesOuvertureCloture(fichiersExcel) {
  if (fichiersExcel.length === 0) {
    return { statut: null, justification: "Aucun fichier de balance générale trouvé dans ce cycle — impossible de vérifier automatiquement." };
  }

  const balancesParsees = [];
  for (const fichier of fichiersExcel) {
    try {
      const buffer = fs.readFileSync(fichier.chemin);
      const comptes = parserBalance(buffer);
      if (comptes) balancesParsees.push({ nom: fichier.nom, comptes });
    } catch { /* fichier illisible, ignoré */ }
  }

  if (balancesParsees.length === 0) {
    return { statut: null, justification: "La structure des fichiers de balance n'a pas été reconnue (colonnes ouverture/clôture débit/crédit introuvables) — à vérifier manuellement." };
  }
  if (balancesParsees.length === 1) {
    return { statut: null, justification: `Un seul fichier de balance exploitable (${balancesParsees[0].nom}). Le fichier de la balance N-1 est nécessaire pour vérifier la concordance des soldes — merci de l'ajouter.` };
  }
  // On ne devine pas lesquels comparer parmi 3+ fichiers (doublons, N-2 en plus de N et N-1,
  // etc.) — comparer silencieusement seulement les deux premiers risquerait de choisir la
  // mauvaise paire sans que personne ne s'en aperçoive.
  if (balancesParsees.length > 2) {
    const liste = balancesParsees.map(b => `"${b.nom}"`).join(', ');
    return { statut: null, justification: `${balancesParsees.length} fichiers de balance exploitables trouvés (${liste}) — impossible de déterminer automatiquement lesquels comparer. Merci de ne garder que les balances N et N-1 dans ce cycle.` };
  }

  const [a, b] = balancesParsees;
  const { total, ecarts } = comparerSoldes(a.comptes, b.comptes);

  if (total < 3) {
    return { statut: null, justification: `Trop peu de comptes communs entre "${a.nom}" et "${b.nom}" (${total}) pour conclure automatiquement — à vérifier manuellement.` };
  }
  if (ecarts.length === 0) {
    return { statut: 'oui', justification: `Concordance vérifiée sur ${total} comptes communs entre "${a.nom}" et "${b.nom}" (tolérance ${TOLERANCE}).` };
  }
  const detail = ecarts.slice(0, 5).map(e => `compte ${e.compte} (écart ${e.ecart})`).join(', ');
  return { statut: 'non', justification: `${ecarts.length}/${total} comptes présentent un écart entre solde d'ouverture et solde de clôture N-1 : ${detail}${ecarts.length > 5 ? ', …' : ''}.` };
}

module.exports = { soldesOuvertureCloture };
