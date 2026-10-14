// Octobre 2026 : les cycles Stocks et Trésorerie de l'application ne suivaient pas les questions
// du GUDEF (modèle Word des diligences) — même identifiant, question différente, donc chaque
// réponse s'imprimait en face d'une autre question. Les points ont été réécrits selon le GUDEF ;
// cette migration déplace les réponses déjà saisies vers le point de même sens.
//
// Chaque cycle migré garde ses anciens points tels quels dans `avantGudef` (rien n'est perdu,
// notamment l'ancien tr_5 "variation de trésorerie" qui n'a pas d'équivalent GUDEF), et la
// présence de `avantGudef` rend la migration sans effet si on la relance.

// nouveau point <- ancien point
const CORRESPONDANCES = {
  stocks: {
    st_1: 'st_1', // inventaire physique
    st_2: 'st_2', // état valorisé
    st_3: 'st_2', // l'ancien st_2 couvrait aussi le rapprochement avec la balance et le bilan
    st_4: 'st_3', // méthode d'évaluation
    st_5: 'st_4', // permanence des méthodes
    st_6: 'st_5', // dépréciations
    st_7: 'st_6', // coût d'achat des ventes x coefficient
  },
  tresorerie: {
    tr_1: 'tr_4', // inventaire de caisse
    tr_3: 'tr_2', // comptes bancaires / page 5
    tr_4: 'tr_6', // soldes de caisse créditeurs
    tr_5: 'tr_1', // rapprochement bancaire de décembre
    tr_6: 'tr_3', // suspens (chèques, virements en attente)
    // tr_2 (virements internes), tr_7 (trésorerie passive), tr_8 (hors bilan) : nouveaux
  },
};

function migrerCyclesReponses(cyclesReponses, date) {
  let modifie = false;
  const resultat = { ...cyclesReponses };
  for (const [cycleId, correspondances] of Object.entries(CORRESPONDANCES)) {
    const cycle = resultat[cycleId];
    if (!cycle || cycle.avantGudef) continue;
    const anciens = cycle.points || {};
    const points = {};
    for (const [nouveau, ancien] of Object.entries(correspondances)) {
      if (anciens[ancien]) points[nouveau] = { ...anciens[ancien] };
    }
    resultat[cycleId] = { ...cycle, points, avantGudef: { date, points: anciens } };
    modifie = true;
  }
  return modifie ? resultat : null;
}

module.exports = { CORRESPONDANCES, migrerCyclesReponses };
