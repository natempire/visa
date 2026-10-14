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
// tolère un en-tête sur une ou deux lignes fusionnées. La balance peut être un onglet d'un
// classeur plus large (feuille de travail) : on retient le premier onglet reconnu.
function parserBalance(buffer) {
  const classeur = XLSX.read(buffer, { type: 'buffer' });
  for (const nom of classeur.SheetNames) {
    const lignes = XLSX.utils.sheet_to_json(classeur.Sheets[nom], { header: 1, raw: true, defval: '' });
    const comptes = parserFeuille(lignes);
    if (comptes && ressembleBalanceGenerale(comptes)) return comptes;
  }
  return null;
}

// Les feuilles de travail contiennent souvent de petits tableaux de comptes (extrait des
// charges, comptes de trésorerie...) qui ont l'allure d'une balance. Une balance générale
// couvre au contraire plusieurs classes du plan comptable (bilan et gestion).
function ressembleBalanceGenerale(comptes) {
  const numeros = Object.keys(comptes);
  const classes = new Set(numeros.map(c => c[0]));
  return numeros.length >= 10 && classes.size >= 4;
}

function parserFeuille(lignes) {
  let ligneEntete = -1;
  for (let i = 0; i < Math.min(lignes.length, 15); i++) {
    // Une ligne qui commence par un numéro de compte est une ligne de données, même si son
    // libellé contient "compte" (ex. "104000 COMPTE EXPLOITANT").
    if (/^\d/.test(String(lignes[i][0] || '').trim())) continue;
    if (lignes[i].some(c => normaliser(c).includes('compte'))) { ligneEntete = i; break; }
  }
  if (ligneEntete === -1) return parserBalanceSansEntete(lignes);

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

// Export "six colonnes" sans ligne d'en-tête (ex. Sage) : compte, libellé, ouverture D/C,
// mouvements D/C, clôture D/C. Faute de titres, on ne retient cette lecture que si elle se
// vérifie arithmétiquement (ouverture + mouvements = clôture) sur au moins 90 % des comptes, et
// si la plupart des comptes ont un solde de clôture : un tableau à trois colonnes du type
// "ouverture N / clôture N-1 / écart" (feuille de travail) passe sinon le test par construction,
// ses colonnes "clôture" étant vides.
function parserBalanceSansEntete(lignes) {
  const comptes = {};
  let lues = 0;
  let coherentes = 0;
  let avecCloture = 0;
  for (const ligne of lignes) {
    const compte = String(ligne[0] || '').trim();
    if (!/^\d{2,}$/.test(compte) || ligne.length < 8) continue;
    const montants = ligne.slice(2, 8);
    // Une colonne de montants ne contient que des nombres ou des cases vides (pas "RA", "N/A"...).
    if (montants.some(m => m !== '' && typeof m !== 'number' && !/^-?[\d\s.,]+$/.test(String(m).trim()))) return null;
    const [ouvD, ouvC, mvtD, mvtC, clotD, clotC] = montants.map(nombre);
    const soldeOuverture = ouvD - ouvC;
    const soldeCloture = clotD - clotC;
    lues++;
    if (Math.abs(soldeOuverture + mvtD - mvtC - soldeCloture) <= TOLERANCE) coherentes++;
    if (Math.abs(soldeCloture) > TOLERANCE) avecCloture++;
    comptes[compte] = { soldeOuverture, soldeCloture };
  }
  if (lues < 3 || coherentes / lues < 0.9 || avecCloture / lues < 0.5) return null;
  return comptes;
}

// Compare, pour deux balances, la clôture de l'une à l'ouverture de l'autre (on ne sait pas
// à l'avance laquelle est N et laquelle est N-1), et retient le sens le plus cohérent.
function comparerSoldes(balanceA, balanceB) {
  const compare = (source, cible) => {
    // Comptes de bilan seulement (classes 1 à 5) : les comptes de gestion (6, 7, 8) repartent
    // de zéro chaque exercice, leur solde d'ouverture ne reprend jamais la clôture N-1.
    const comptesCommuns = Object.keys(source).filter(c => /^[1-5]/.test(c) && cible[c] !== undefined);
    const ecarts = comptesCommuns
      .map(c => ({ compte: c, ecart: Math.round((source[c].soldeCloture - cible[c].soldeOuverture) * 100) / 100 }))
      .filter(e => Math.abs(e.ecart) > TOLERANCE);
    return { total: comptesCommuns.length, ecarts };
  };

  const sensAB = compare(balanceA, balanceB);
  const sensBA = compare(balanceB, balanceA);
  // Le sens correct (quel fichier est N-1 vs N) est celui qui produit le moins d'écarts :
  // dans le mauvais sens, on compare des colonnes sans rapport et les écarts explosent.
  // `balanceN` indique laquelle des deux est la balance N (celle dont on lit l'ouverture).
  return sensAB.ecarts.length <= sensBA.ecarts.length
    ? { ...sensAB, balanceN: 'B' }
    : { ...sensBA, balanceN: 'A' };
}

function lireBalances(fichiersExcel) {
  const balancesParsees = [];
  for (const fichier of fichiersExcel) {
    try {
      const buffer = fs.readFileSync(fichier.chemin);
      const comptes = parserBalance(buffer);
      if (comptes) balancesParsees.push({ nom: fichier.nom, comptes });
    } catch { /* fichier illisible, ignoré */ }
  }
  return balancesParsees;
}

// Pas de balance exploitable : on dit quels fichiers ont été regardés et quoi déposer, plutôt
// qu'un message de "format" trompeur quand les fichiers présents sont des feuilles de travail.
function aucuneBalance(fichiersExcel) {
  const consigne = "Déposez la balance générale six colonnes (soldes d'ouverture, mouvements, soldes de clôture) "
    + "exportée du logiciel comptable, N et N-1, dans le cycle « Organisation comptable ».";
  if (fichiersExcel.length === 0) {
    return { statut: null, justification: `Aucune balance générale trouvée. ${consigne}` };
  }
  const liste = fichiersExcel.map(f => `"${f.nom}"`).join(', ');
  return { statut: null, justification: `Aucune balance générale parmi les fichiers Excel examinés (${liste}). ${consigne}` };
}

function soldesOuvertureCloture(fichiersExcel) {
  const balancesParsees = lireBalances(fichiersExcel);
  if (balancesParsees.length === 0) return aucuneBalance(fichiersExcel);

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
    return { statut: null, justification: `Trop peu de comptes de bilan communs entre "${a.nom}" et "${b.nom}" (${total}) pour conclure automatiquement — à vérifier manuellement.` };
  }
  if (ecarts.length === 0) {
    return { statut: 'oui', justification: `Concordance vérifiée sur ${total} comptes de bilan communs entre "${a.nom}" et "${b.nom}" (tolérance ${TOLERANCE}).` };
  }
  const detail = ecarts.slice(0, 5).map(e => `compte ${e.compte} (écart ${e.ecart})`).join(', ');
  return { statut: 'non', justification: `${ecarts.length}/${total} comptes présentent un écart entre solde d'ouverture et solde de clôture N-1 : ${detail}${ecarts.length > 5 ? ', …' : ''}.` };
}

// Comptes de virements internes (classe 58 SYSCOHADA : virements de fonds, autres virements
// internes) : ce sont des comptes de passage, qui doivent être soldés à la clôture. Une balance
// six colonnes N suffit (on lit sa colonne clôture) ; si on a N et N-1, on repère N par le même
// test que soldesOuvertureCloture.
function virementsInternesSoldes(fichiersExcel) {
  const balancesParsees = lireBalances(fichiersExcel);
  if (balancesParsees.length === 0) return aucuneBalance(fichiersExcel);
  if (balancesParsees.length > 2) {
    const liste = balancesParsees.map(b => `"${b.nom}"`).join(', ');
    return { statut: null, justification: `${balancesParsees.length} fichiers de balance exploitables trouvés (${liste}) — impossible de déterminer automatiquement la balance N. Merci de ne garder que les balances N et N-1.` };
  }

  let balanceN = balancesParsees[0];
  if (balancesParsees.length === 2) {
    const [a, b] = balancesParsees;
    const { total, balanceN: laquelle } = comparerSoldes(a.comptes, b.comptes);
    if (total < 3) {
      return { statut: null, justification: `Impossible de déterminer laquelle de "${a.nom}" et "${b.nom}" est la balance N (trop peu de comptes communs) — à vérifier manuellement.` };
    }
    balanceN = laquelle === 'A' ? a : b;
  }

  const comptes58 = Object.keys(balanceN.comptes).filter(c => c.startsWith('58'));
  if (comptes58.length === 0) {
    return { statut: 'oui', justification: `Aucun compte de virements internes (58) dans la balance "${balanceN.nom}" : rien à solder.` };
  }
  const nonSoldes = comptes58
    .map(c => ({ compte: c, solde: Math.round(balanceN.comptes[c].soldeCloture * 100) / 100 }))
    .filter(e => Math.abs(e.solde) > TOLERANCE);
  if (nonSoldes.length === 0) {
    return { statut: 'oui', justification: `Les ${comptes58.length} compte(s) de virements internes (58) de la balance "${balanceN.nom}" sont soldés à la clôture.` };
  }
  const detail = nonSoldes.slice(0, 5).map(e => `compte ${e.compte} (solde ${e.solde})`).join(', ');
  return { statut: 'non', justification: `${nonSoldes.length} compte(s) de virements internes non soldé(s) à la clôture dans "${balanceN.nom}" : ${detail}${nonSoldes.length > 5 ? ', …' : ''}.` };
}

module.exports = { soldesOuvertureCloture, virementsInternesSoldes, lireBalances };
