// Documents officiels à obtenir (étape 3)
export const DOCUMENTS_REQUIS = [
  { id: 'doc_1', nom: 'Copie du Registre de Commerce et de crédit mobilier (RCCM)' },
  { id: 'doc_2', nom: 'Copie de la Déclaration Fiscale d\'Existence (DFE)' },
  { id: 'doc_3', nom: 'Copie de la notification d\'immatriculation Employeur CNPS' },
  { id: 'doc_4', nom: 'Autorisation d\'exercer' },
  { id: 'doc_5', nom: 'Copie du projet complet d\'états financiers N et N-1' },
  { id: 'doc_6', nom: 'Copie du ou des Relevé(s) Bancaire(s) de décembre N' },
  { id: 'doc_7', nom: 'Copie des rapprochements bancaires de décembre N' },
  { id: 'doc_8', nom: 'Balance générale à six colonnes de N et N-1 (Excel de préférence)' },
  { id: 'doc_9', nom: 'Balances auxiliaires clients et fournisseurs N et N-1 (Excel de préférence)' },
  { id: 'doc_10', nom: 'Ensemble des déclarations fiscales et sociales de N (états 301, 302, DISA, déclaration de résultat)' },
  { id: 'doc_11', nom: 'Listes d\'inventaire (immobilisations, stocks, caisse)' },
  { id: 'doc_12', nom: 'PV de l\'assemblée générale N-1' },
  { id: 'doc_13', nom: 'Liste des engagements reçus et/ou donnés' },
];

// Cycles de diligences avec leurs points de contrôle
export const CYCLES_DILIGENCES = [
  {
    id: 'organisation_comptable',
    label: 'Organisation comptable',
    roleDefaut: 'assistant',
    points: [
      { id: 'oc_1', texte: 'Résumer les principaux principes, règles et méthodes comptables appliqués par l\'entité. Sont-ils conformes à la réglementation en vigueur ?' },
      { id: 'oc_2', texte: 'Existe-t-il une comptabilité générale ? (Pièces comptables, grand-livre, balance générale, plan de comptes adapté)' },
      { id: 'oc_3', texte: 'Les pièces comptables sont-elles archivées selon des règles prédéfinies ?' },
      { id: 'oc_4', texte: 'Existe-t-il des règles pour la collecte et la transmission des pièces comptables ?' },
      { id: 'oc_5', texte: 'La comptabilité est-elle établie à partir d\'un logiciel ?' },
      { id: 'oc_6', texte: 'Les états financiers concordent-ils avec la balance générale ? (Capitaux propres, Chiffre d\'affaires, Résultat net)' },
      { id: 'oc_7', texte: 'Les soldes d\'ouverture de N correspondent-ils aux soldes de clôture de N-1 ?' },
    ]
  },
  {
    id: 'pages_informations',
    label: "Pages d'informations (garde, p.5, 6, 7)",
    roleDefaut: 'assistant',
    points: [
      { id: 'pi_1', texte: 'Vérifier que la page de garde (Page 1) contient : année d\'exercice, nom et raison sociale, NCC exact et régime fiscal, SAI de rattachement, numéro de téléphone actualisé.' },
      { id: 'pi_2', texte: 'Vérifier sur la fiche d\'identification (Page 5) : N° RCCM et CNPS, désignation précise de l\'activité principale, domiciliations bancaires, nom et qualité du signataire.' },
      { id: 'pi_3', texte: 'S\'assurer que la fiche des dirigeants (Page 7) est correctement renseignée (identité, fonctions, cohérence avec statuts ou PV).' },
      { id: 'pi_4', texte: 'Vérifier à la page 6 : forme juridique, répartition du CA par activité, date de début d\'activité, cohérence avec états financiers.' },
    ]
  },
  {
    id: 'capitaux_propres',
    label: 'Capitaux propres',
    roleDefaut: 'senior',
    points: [
      { id: 'cp_1', texte: 'Obtenir et contrôler le tableau de variation des capitaux propres (concordance bilan N et N-1, exactitude des mouvements).' },
      { id: 'cp_2', texte: 'Vérifier la correcte comptabilisation de l\'affectation du résultat (PV AG N-1, réserves, dividendes, report à nouveau, comptes 12/11).' },
      { id: 'cp_3', texte: 'Obtenir et contrôler le tableau de variation des dettes à long terme (concordance bilan, variation N vs N-1).' },
      { id: 'cp_4', texte: 'Vérifier les remboursements par rapport aux tableaux d\'amortissement des emprunts (séparation capital/intérêts, rapprochement relevés bancaires).' },
      { id: 'cp_5', texte: 'Le cas échéant, vérifier l\'existence et la correcte imputation des charges financières (compte 671, cohérence avec emprunts).' },
      { id: 'cp_6', texte: 'Vérifier que les dotations aux provisions pour risques et charges ont été réintégrées au résultat fiscal et que les reprises ont été déduites.' },
    ]
  },
  {
    id: 'immobilisations',
    label: 'Immobilisations',
    roleDefaut: 'assistant',
    points: [
      { id: 'im_1', texte: 'Obtenir le tableau de variation des immobilisations et des amortissements/dépréciations. Vérifier la concordance avec les soldes d\'ouverture (N-1).' },
      { id: 'im_2', texte: 'Rapprocher le tableau avec les soldes au bilan et au fichier des immobilisations (valeurs brutes et amortissements cumulés).' },
      { id: 'im_3', texte: 'Pointer le total des acquisitions de l\'exercice au TAFIRE (emplois). Vérifier les justificatifs (factures, contrats) et la correcte comptabilisation (classe 2).' },
      { id: 'im_4', texte: 'Cessions/mises au rebut : rapprocher avec la note 3D (plus ou moins-values) et le TAFIRE (ressources). Vérifier le calcul des VNC et la sortie du fichier.' },
      { id: 'im_5', texte: 'Vérifier les durées d\'amortissement conformes SYSCOHADA, recalculer un échantillon. Identifier actifs obsolètes et vérifier les dépréciations.' },
    ]
  },
  {
    id: 'stocks',
    label: 'Stocks',
    roleDefaut: 'assistant',
    points: [
      { id: 'st_1', texte: 'Obtenir le PV d\'inventaire signé. Vérifier la date (proche du 31/12/N), la présence d\'un comité, les procédures d\'inventaire.' },
      { id: 'st_2', texte: 'Obtenir l\'état détaillé des stocks valorisés. Vérifier la cohérence avec l\'inventaire physique et le rapprochement avec la balance générale et le bilan.' },
      { id: 'st_3', texte: 'Vérifier la méthode d\'évaluation utilisée (CUMP ou FIFO/PEPS). Recalculer un échantillon et vérifier la conformité avec le SYSCOHADA.' },
      { id: 'st_4', texte: 'Vérifier la permanence des méthodes d\'évaluation (méthode N vs N-1). En cas de changement, vérifier la justification et la mention en annexe.' },
      { id: 'st_5', texte: 'Le cas échéant, vérifier que les dépréciations de stocks sont justifiées (stocks obsolètes, rotation lente). Contrôler l\'écriture comptable.' },
      { id: 'st_6', texte: 'Test de cohérence globale : calculer le coût d\'achat des ventes (SI + Achats - SF) et le coefficient multiplicateur. Comparer avec N-1 et N-2.' },
    ]
  },
  {
    id: 'clients',
    label: 'Clients',
    roleDefaut: 'assistant',
    points: [
      { id: 'cl_1', texte: 'Obtenir la balance auxiliaire clients détaillée. Vérifier la présence des informations clés (nom, solde, ancienneté).' },
      { id: 'cl_2', texte: 'Rapprocher : total balance auxiliaire clients / compte collectif (classe 41) / montant au bilan. Identifier et analyser les écarts.' },
      { id: 'cl_3', texte: 'S\'assurer du respect de la permanence des méthodes (méthode N vs N-1). Vérifier mention en annexe en cas de changement.' },
      { id: 'cl_4', texte: 'Obtenir l\'état des créances douteuses. Vérifier la méthode de provisionnement, l\'ancienneté des créances, les justificatifs (relances, litiges).' },
      { id: 'cl_5', texte: 'Vérifier l\'absence de compensation entre comptes clients débiteurs et créditeurs. Reclasser si nécessaire.' },
      { id: 'cl_6', texte: 'Analyser la variation du poste clients (N vs N-1). Rapprocher chiffre d\'affaires et encaissements (banques + caisse). Calculer le délai moyen de paiement (DSO).' },
    ]
  },
  {
    id: 'fournisseurs',
    label: 'Fournisseurs',
    roleDefaut: 'assistant',
    points: [
      { id: 'fo_1', texte: 'Obtenir la balance auxiliaire fournisseurs. Vérifier la présence des informations clés (nom, solde, ancienneté).' },
      { id: 'fo_2', texte: 'Rapprocher : total balance auxiliaire fournisseurs / compte collectif (classe 40) / montant au bilan. Identifier les écarts éventuels.' },
      { id: 'fo_3', texte: 'Vérifier l\'absence de compensation entre comptes fournisseurs débiteurs et créditeurs. Contrôler le reclassement des soldes anormaux.' },
      { id: 'fo_4', texte: 'Revue des factures reçues après clôture : vérifier si elles concernent N. Identifier les dettes non enregistrées (test d\'exhaustivité).' },
      { id: 'fo_5', texte: 'Identifier les dettes anciennes non réglées. Vérifier la réalité de la dette et le risque de litige. Vérifier le cut-off achats (imputation sur le bon exercice).' },
    ]
  },
  {
    id: 'personnel',
    label: 'Personnel et comptes rattachés',
    roleDefaut: 'assistant',
    points: [
      { id: 'pe_1', texte: 'Identifier le système de paie utilisé (logiciel, Excel, livre de paie). Vérifier l\'existence d\'une procédure formalisée et la séparation des tâches.' },
      { id: 'pe_2', texte: 'Rapprocher journal de paie et grand livre (comptes 661, 662, 663 pour salaires ; 664 pour charges sociales). Analyser les écarts éventuels.' },
      { id: 'pe_3', texte: 'Obtenir et vérifier les déclarations sociales (DISA, États 301 et 302). Rapprocher les données déclarées avec la comptabilité et les états financiers.' },
      { id: 'pe_4', texte: 'Recalculer un échantillon de salaires (brut, retenues, net à payer). Vérifier les taux appliqués (CNPS, ITS). Contrôler les provisions sociales (congés payés, fin de carrière).' },
    ]
  },
  {
    id: 'etat_collectivites',
    label: 'État et collectivités publiques',
    roleDefaut: 'assistant',
    points: [
      { id: 'ec_1', texte: 'Obtenir le grand livre des comptes État (classe 44) et les déclarations fiscales. Rapprocher les soldes comptables avec les déclarations et les états financiers.' },
      { id: 'ec_2', texte: 'Analyser les comptes 64 (impôts et taxes) et 44 (dettes fiscales). Vérifier la bonne affectation des charges par nature (IS, TVA, ITS, Patente, etc.).' },
      { id: 'ec_3', texte: 'TVA : rapprocher TVA collectée vs chiffre d\'affaires ; TVA déductible vs achats. Vérifier crédit TVA / TVA à payer.' },
      { id: 'ec_4', texte: 'IS : vérifier résultat fiscal vs résultat comptable. Contrôler les réintégrations et déductions. Vérifier le paiement effectif des impôts (rapprochement quittances).' },
      { id: 'ec_5', texte: 'Identifier les risques fiscaux : retards déclaratifs, anomalies. Documenter les risques potentiels de redressement.' },
    ]
  },
  {
    id: 'divers',
    label: 'Divers (sociétés apparentées, comptes courants)',
    roleDefaut: 'senior',
    points: [
      { id: 'di_1', texte: 'Identifier toutes les sociétés apparentées (filiales, sociétés sœurs, holdings). Vérifier l\'existence de comptes intragroupe (classe 46).' },
      { id: 'di_2', texte: 'Vérifier la conformité des transactions intragroupe avec l\'article 36 du CGI (prix de transfert). Obtenir la documentation des transactions (contrats, conventions).' },
      { id: 'di_3', texte: 'Obtenir la convention de compte courant d\'associé. Vérifier la signature, les conditions (taux d\'intérêt, modalités de remboursement) et la cohérence comptable.' },
      { id: 'di_4', texte: 'S\'assurer de l\'absence de soldes débiteurs pour les associés personnes physiques. En cas de solde débiteur, obtenir justification et vérifier la régularisation.' },
    ]
  },
  {
    id: 'tresorerie',
    label: 'Trésorerie',
    roleDefaut: 'assistant',
    points: [
      { id: 'tr_1', texte: 'Obtenir les relevés bancaires de décembre N et effectuer le rapprochement bancaire. Vérifier la concordance entre soldes bancaires et soldes comptables (classe 52).' },
      { id: 'tr_2', texte: 'Vérifier l\'exhaustivité des comptes bancaires déclarés (cohérence avec la fiche d\'identification page 5 — domiciliations bancaires).' },
      { id: 'tr_3', texte: 'Contrôler les chèques en circulation et les virements en attente à la date de clôture. Vérifier leur correcte comptabilisation.' },
      { id: 'tr_4', texte: 'Vérifier l\'inventaire de caisse au 31/12/N (PV de caisse signé). Rapprocher avec le solde comptable du compte 571.' },
      { id: 'tr_5', texte: 'Analyser la variation de trésorerie (N vs N-1). Identifier les flux significatifs et vérifier leur cohérence avec l\'activité de l\'entité.' },
      { id: 'tr_6', texte: 'Vérifier l\'absence de soldes créditeurs de caisse (solde négatif impossible en pratique). Identifier et expliquer tout solde anormal.' },
    ]
  },
  {
    id: 'comptes_charges',
    label: 'Comptes de charges',
    roleDefaut: 'assistant',
    points: [
      { id: 'cc_1', texte: 'Effectuer une revue analytique des comptes de charges. Analyser les marges et identifier les causes des variations significatives d\'une année sur l\'autre.' },
      { id: 'cc_2', texte: 'Locations, redevances crédit-bail, assurances : vérifier que les charges comptabilisées correspondent à celles échues au cours de l\'exercice.' },
      { id: 'cc_3', texte: 'Impôts et taxes : vérifier l\'acquittement des impôts (foncier, patentes, taxe sur salaires, taxe d\'apprentissage, formation continue, vignettes, etc.). Rapprocher avec les déclarations.' },
      { id: 'cc_4', texte: 'Rémunérations et jetons de présence : vérifier les décisions d\'attribution par AG ou CA. Vérifier la pratique du décalage de paie et les provisions (congés payés, retraite).' },
      { id: 'cc_5', texte: 'Charges sociales : rapprocher les comptes de charges avec les déclarations sociales. Vérifier le retraitement du personnel extérieur (compte 637) et le tableau 11.' },
      { id: 'cc_6', texte: 'Intérêts et agios bancaires / comptes courants : identifier les causes des variations significatives. S\'assurer que les écritures de retraitement crédit-bail sont opérées.' },
    ]
  },
  {
    id: 'comptes_produits',
    label: 'Comptes de produits',
    roleDefaut: 'assistant',
    points: [
      { id: 'pr_1', texte: 'Effectuer une revue analytique des comptes de produits.' },
      { id: 'pr_2', texte: 'Rapprocher le chiffre d\'affaires déclaré et le chiffre d\'affaires comptabilisé.' },
      { id: 'pr_3', texte: 'Vérifier que la séquence des factures N est continue et que leur addition correspond au CA inscrit au compte de résultat.' },
      { id: 'pr_4', texte: 'Vérifier que le niveau du CA est globalement cohérent avec la variation du poste client et des encaissements (banques et caisse).' },
      { id: 'pr_5', texte: 'Subventions d\'exploitation : examiner les documents attributifs. Vérifier qu\'elles sont bien imputables à l\'exercice.' },
    ]
  },
  {
    id: 'etats_annexes',
    label: 'Vérifications des états annexes',
    roleDefaut: 'assistant',
    points: [
      { id: 'ea_1', texte: 'Vérifier les informations obligatoires de l\'annexe : méthodes d\'évaluation (annexe 1/28 p.20), produits HAO et transferts de charges (annexe 9/28), charges HAO (annexe 10/28), TVA facturée et récupérable (annexe 12/28), répartition du capital.' },
      { id: 'ea_2', texte: 'Vérifier les informations significatives : subvention d\'investissement et provisions réglementées (annexe 14/28), comptes courants associés (annexe 16/28), rémunérations organes de direction (annexe 17/28).' },
      { id: 'ea_3', texte: 'Vérifier la structure des états financiers selon les dispositions légales (système normal, allégé, minimal de trésorerie).' },
      { id: 'ea_4', texte: 'Contrôler la cohérence entre les comptes et les tableaux en annexes : T1&T2 (annexe 18&19/28), T4 provisions (annexe 21/28), T9 données sur 5 exercices (annexe 26/28), T10 affectation résultat (annexe 27/28), T11 effectifs (annexe 28/28).' },
    ]
  },
];
