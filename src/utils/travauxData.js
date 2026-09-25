// Travaux détaillés du programme de travail par point de diligence
// Clé = point.id, Valeur = description des travaux à réaliser

export const TRAVAUX_PAR_POINT = {
  // Organisation comptable
  oc_1: "Principes comptables :\n• Vérifier le plan de comptes utilisé\n• Examiner les méthodes comptables retenues\n• Vérifier la permanence et la cohérence des méthodes\n• S'assurer que les états financiers sont établis selon le SYSCOHADA révisé",
  oc_2: "Existence comptabilité :\n• Examiner les journaux comptables\n• Vérifier les écritures d'inventaire et d'ajustement\n• Identifier les écritures inhabituelles ou manuelles\n• S'assurer que toutes les opérations sont enregistrées fidèlement",
  oc_3: "Cohérence de la balance, du grand livre et des états financiers :\n• Rapprocher balance, grand livre et états financiers\n• Vérifier l'égalité débit/crédit\n• Examiner les soldes anormaux",
  oc_4: "Vérifier les règles de collecte et transmission des pièces comptables",
  oc_5: "Identifier le logiciel utilisé, vérifier les paramètres comptables",
  oc_6: "Rapprocher les soldes clés : capitaux propres, CA, résultat net entre balance et états financiers",
  oc_7: "Pointer les soldes d'ouverture N avec les soldes de clôture N-1 sur la balance et les états financiers",

  // Pages d'informations
  pi_1: "1. Vérification de la page de garde (Page 1) :\n• Vérifier la présence et l'exactitude de : Année d'exercice, Dénomination sociale, Numéro NCC, Régime fiscal, S.A.I. de rattachement, Numéro de téléphone\n• Contrôler la cohérence avec les documents juridiques (RCCM, statuts)",
  pi_2: "2. Fiche d'identification (Page 5) :\n• Vérifier : Numéro RCCM, Numéro CNPS\n• Contrôler l'activité principale (cohérence avec le CA)\n• Vérifier les domiciliations bancaires (cohérence avec cycle trésorerie)\n• Vérifier le nom et qualité du signataire",
  pi_3: "3. Fiche des dirigeants (Page 7) :\n• Vérifier : Identité des dirigeants, Fonctions (DG, PCA, Gérant, etc.)\n• Contrôler la cohérence avec les statuts ou PV\n• Vérifier l'exhaustivité des informations",
  pi_4: "4. Informations générales (Page 6) :\n• Vérifier la forme juridique (SA, SARL, etc.)\n• Contrôler la répartition du CA par activité\n• Vérifier la date de début d'activité\n• Analyser la cohérence avec les états financiers et l'activité réelle",

  // Capitaux propres
  cp_1: "Tableau de variation des capitaux propres :\n• Obtenir le tableau de variation des capitaux propres\n• Vérifier : Concordance avec le bilan (N et N-1), Exactitude des mouvements (augmentation, diminution)\n• Contrôler : Capital social, Réserves et Résultat\n• Vérifier la cohérence globale des variations",
  cp_2: "Affectation du résultat :\n• Obtenir le PV de l'Assemblée Générale ayant statué sur les comptes N-1\n• Vérifier : Résultat N-1 affecté (réserves, dividendes, report à nouveau)\n• Rapprocher : Écritures comptables d'affectation et Décision de l'AG\n• Vérifier la correcte comptabilisation dans les comptes 12/11",
  cp_3: "Dettes à long terme :\n• Obtenir le tableau de variation des dettes à long terme\n• Vérifier : Concordance avec le bilan et Variation N vs N-1\n• Identifier : Nouveaux emprunts et Remboursements",
  cp_4: "Remboursements des emprunts :\n• Obtenir les tableaux d'amortissement des emprunts\n• Vérifier : Correspondance avec les remboursements comptabilisés\n• Contrôler : Séparation capital/intérêts\n• Rapprocher avec les relevés bancaires",
  cp_5: "Charges financières :\n• Analyser le compte 671 (intérêts)\n• Vérifier : Cohérence avec les emprunts existants\n• Rapprocher : Charges enregistrées vs tableaux d'amortissement",
  cp_6: "Provisions pour risques et charges (impact fiscal) :\n• Identifier les provisions comptabilisées\n• Vérifier : Réintégration fiscale des dotations, Déduction des reprises\n• Contrôler : Cohérence avec la liasse fiscale",

  // Immobilisations
  im_1: "Tableau de variation des immobilisations :\n• Obtenir : Tableau de variation des immobilisations, Tableau des amortissements\n• Vérifier : Concordance avec les soldes d'ouverture (N-1), Exhaustivité des mouvements\n• Contrôler : Cohérence des dotations aux amortissements",
  im_2: "Rapprochement avec bilan et fichier des immobilisations :\n• Rapprocher : Tableau des immobilisations / Balance générale / Bilan / Fichier des immobilisations\n• Vérifier : Correspondance des valeurs brutes et amortissements cumulés",
  im_3: "Acquisitions (TAFIRE - emplois) :\n• Identifier les acquisitions de l'exercice\n• Rapprocher le total acquisitions du tableau avec les montants du TAFIRE (emplois)\n• Vérifier les justificatifs (factures, contrats) et correcte comptabilisation (classe 2)",
  im_4: "Cessions/mises au rebut :\n• Identifier les immobilisations cédées ou mises au rebut\n• Rapprocher avec la Note 3D (plus ou moins-values) et le TAFIRE (ressources)\n• Vérifier le calcul des VNC et la sortie du fichier des immobilisations",
  im_5: "Contrôles complémentaires :\n• Vérifier les durées d'amortissement conformes SYSCOHADA\n• Recalculer un échantillon\n• Identifier actifs obsolètes/non utilisés\n• Vérifier la justification des dépréciations",

  // Stocks
  st_1: "Inventaire physique :\n• Obtenir le PV d'inventaire signé\n• Vérifier la date (doit être proche du 31/12/N)\n• Vérifier la présence d'un comité d'inventaire\n• Contrôler les procédures d'inventaire (instructions écrites)",
  st_2: "Existence d'un état valorisé et concordance :\n• Obtenir l'état détaillé des stocks (quantités + valeurs)\n• Vérifier la cohérence avec l'inventaire physique\n• Rapprocher : Stock inventaire vs Balance générale vs Bilan",
  st_3: "Méthode d'évaluation (CUMP/FIFO) :\n• Identifier la méthode utilisée : CUMP, FIFO (PEPS)\n• Recalculer un échantillon : Vérifier coût unitaire, Cohérence des entrées/sorties\n• Vérifier conformité avec SYSCOHADA",
  st_4: "Permanence des méthodes :\n• Comparer méthode N vs N-1\n• Identifier tout changement\n• Vérifier justification et mention en annexe",
  st_5: "Dépréciation des stocks :\n• Identifier stocks obsolètes, à rotation lente\n• Vérifier calcul des provisions\n• Vérifier cohérence avec historique de vente",
  st_6: "Test de cohérence globale (marge/coefficient) :\n• Calculer : SI + Achats – SF = Coût d'achat des ventes\n• Calculer le coefficient multiplicateur = CA TTC / Coût des ventes\n• Comparer avec N-1 et N-2\n• Analyser les écarts significatifs",

  // Clients
  cl_1: "Existence d'une balance auxiliaire clients :\n• Obtenir la balance auxiliaire clients (détaillée)\n• Vérifier : Présence des informations clés (nom client, solde, ancienneté)\n• Contrôler le total de la balance auxiliaire",
  cl_2: "Concordance balance/compte collectif/bilan :\n• Rapprocher : Total balance auxiliaire clients / Compte collectif (classe 41) / Montant au bilan\n• Identifier les écarts et obtenir justificatifs",
  cl_3: "Permanence des méthodes :\n• Comparer méthodes d'évaluation N vs N-1\n• Vérifier absence de changement injustifié\n• En cas de changement : vérifier mention dans les annexes",
  cl_4: "Créances douteuses :\n• Obtenir l'état des créances douteuses\n• Vérifier la méthode de provisionnement et l'ancienneté des créances\n• Tester un échantillon : justificatifs (relances, litiges, impayés)",
  cl_5: "Absence de compensation :\n• Analyser les comptes clients : identifier soldes créditeurs\n• Vérifier l'absence de compensation entre clients débiteurs et créditeurs\n• Reclasser si nécessaire",
  cl_6: "Cohérence clients/CA/encaissements :\n• Analyser la variation du poste clients (N vs N-1)\n• Rapprocher CA et encaissements (banques + caisse)\n• Calculer le délai moyen de paiement (DSO)\n• Identifier les variations anormales",

  // Fournisseurs
  fo_1: "Existence d'une balance auxiliaire fournisseurs :\n• Obtenir la balance auxiliaire fournisseurs\n• Vérifier la présence des informations clés (nom, solde, ancienneté)",
  fo_2: "Concordance balance/compte collectif/bilan :\n• Rapprocher : Total balance auxiliaire / Compte collectif (classe 40) / Montant au bilan\n• Identifier les écarts éventuels",
  fo_3: "Absence de compensation fournisseurs :\n• Analyser la balance fournisseurs : identifier soldes débiteurs\n• Vérifier l'absence de compensation\n• Contrôler le reclassement des soldes anormaux",
  fo_4: "Test d'exhaustivité des dettes :\n• Revue des factures reçues après clôture\n• Vérifier si elles concernent N\n• Identifier les dettes non enregistrées",
  fo_5: "Analyse des dettes anciennes et cut-off :\n• Identifier les dettes anciennes non réglées\n• Vérifier la réalité de la dette et le risque de litige\n• Vérifier les factures fin d'année (bonne imputation sur le bon exercice)",

  // Personnel
  pe_1: "Organisation/procédure de paie :\n• Identifier le système utilisé : logiciel, Excel, livre de paie\n• Vérifier l'existence d'une procédure formalisée\n• Analyser le circuit de validation des salaires\n• Contrôler la séparation des tâches (élaboration/validation/paiement)",
  pe_2: "Concordance paie/comptabilité :\n• Obtenir : Journal de paie / Grand livre (classe 66, 64 et 42)\n• Rapprocher : Total salaires vs comptes 661, 662, 663 / Charges sociales vs compte 664\n• Analyser les écarts éventuels",
  pe_3: "Déclarations sociales (DISA, États 301 et 302) :\n• Obtenir : DISA, États 301 et 302\n• Vérifier le dépôt effectif des déclarations\n• Rapprocher les données déclarées vs comptabilité",
  pe_4: "Tests complémentaires :\n• Recalculer un échantillon de salaires (brut, retenues, net à payer)\n• Vérifier les taux appliqués (CNPS, ITS)\n• Vérifier les provisions sociales (congés payés, fin de carrière)",

  // État et collectivités
  ec_1: "Concordance comptes État/déclarations fiscales :\n• Obtenir : Grand livre des comptes État (classe 44) et déclarations fiscales (TVA, ITS, Patente, etc.)\n• Rapprocher : Soldes comptables vs déclarations fiscales vs états financiers (bilan)\n• Identifier les écarts et obtenir justificatifs (avis d'imposition, quittances)",
  ec_2: "Imputation des charges fiscales :\n• Analyser les comptes 64 (impôts et taxes) et 44 (dettes fiscales)\n• Vérifier la bonne affectation par nature (IS, TVA, ITS, etc.)\n• Tester un échantillon : justificatifs (déclarations, avis, quittances)",
  ec_3: "TVA :\n• Rapprocher TVA collectée vs chiffre d'affaires\n• Rapprocher TVA déductible vs achats\n• Vérifier crédit TVA / TVA à payer",
  ec_4: "IS et paiements fiscaux :\n• Vérifier résultat fiscal vs résultat comptable\n• Contrôler les réintégrations et déductions\n• Vérifier le paiement effectif des impôts (rapprochement quittances)",
  ec_5: "Risques fiscaux :\n• Identifier : retards déclaratifs, anomalies\n• Documenter les risques potentiels de redressement",

  // Divers
  di_1: "Identification des sociétés apparentées :\n• Obtenir : Organigramme du groupe, Liste des sociétés liées\n• Vérifier l'existence de comptes intragroupe (classe 46)\n• Analyser les transactions significatives",
  di_2: "Transactions intragroupe (conformité fiscale) :\n• Vérifier la conformité avec l'article 36 du CGI (prix de transfert)\n• Obtenir la documentation des transactions (contrats, conventions)\n• Analyser la nature et volume des opérations",
  di_3: "Convention de compte courant d'associé :\n• Obtenir la convention de compte courant d'associé\n• Vérifier : Signature, conditions (taux d'intérêt, modalités de remboursement)\n• Contrôler la cohérence avec les écritures comptables",
  di_4: "Absence de soldes débiteurs associés :\n• Analyser les comptes courants d'associés\n• Identifier les soldes débiteurs\n• En cas de solde débiteur : obtenir justification et vérifier régularisation",

  // Comptes de charges
  cc_1: "Revue analytique des comptes de charges :\n• Analyser les marges et identifier les causes des variations significatives\n• Locations, crédit-bail, assurances : vérifier que les charges correspondent à celles échues",
  cc_2: "Locations, crédit-bail, assurances :\n• Vérifier que les charges comptabilisées correspondent à celles échues au cours de l'exercice\n• Identifier les causes des variations significatives",
  cc_3: "Impôts et taxes :\n• Vérifier l'acquittement : foncier, patentes, taxe sur salaires, apprentissage, formation continue, vignettes\n• Rapprocher avec les déclarations fiscales",
  cc_4: "Rémunérations et charges de personnel :\n• Vérifier les décisions d'attribution par AG ou CA\n• Vérifier la pratique du décalage de paie et les provisions (congés payés, retraite)",
  cc_5: "Charges sociales et personnel extérieur :\n• Rapprocher les comptes de charges avec les déclarations sociales\n• Vérifier le retraitement du personnel extérieur (compte 637) et le tableau 11",
  cc_6: "Intérêts et agios :\n• Identifier les causes des variations significatives\n• Vérifier que les écritures de retraitement crédit-bail sont opérées à la clôture",

  // Comptes de produits
  pr_1: "Revue analytique des comptes de produits",
  pr_2: "Rapprocher le CA déclaré et le CA comptabilisé",
  pr_3: "Vérifier la continuité de la séquence des factures N et leur concordance avec le CA du compte de résultat",
  pr_4: "Vérifier la cohérence du CA avec la variation du poste client et des encaissements (banques et caisse)",
  pr_5: "Subventions d'exploitation : examiner les documents attributifs, vérifier l'imputation à l'exercice",

  // États annexes
  ea_1: "Informations obligatoires de l'annexe :\n• Méthodes d'évaluation (annexe 1/28 p.20)\n• Produits HAO et transferts de charges (annexe 9/28)\n• Charges HAO (annexe 10/28)\n• TVA facturée et récupérable (annexe 12/28)\n• Répartition du capital (annexe 12/28)",
  ea_2: "Informations significatives :\n• Subvention d'investissement et provisions réglementées (annexe 14/28)\n• Comptes courants associés (annexe 16/28)\n• Rémunérations des organes de direction (annexe 17/28)",
  ea_3: "Structure des états financiers :\n• Vérifier conformité avec les dispositions légales\n• Système normal, allégé ou minimal de trésorerie",
  tr_1: "Rapprochement bancaire :\n• Obtenir les relevés bancaires de décembre N\n• Effectuer ou vérifier le rapprochement bancaire\n• Identifier les écarts : chèques non encaissés, virements en attente\n• Vérifier la concordance avec le grand livre (compte 52x)",
  tr_2: "Exhaustivité des comptes bancaires :\n• Comparer les comptes ouverts avec la fiche d'identification (page 5)\n• Vérifier que tous les comptes sont déclarés et comptabilisés\n• Identifier tout compte non déclaré",
  tr_3: "Chèques et virements en attente :\n• Lister les chèques émis non encaissés au 31/12/N\n• Vérifier les virements en transit\n• S'assurer de leur correcte comptabilisation",
  tr_4: "Inventaire de caisse :\n• Obtenir le PV d'inventaire de caisse signé au 31/12/N\n• Rapprocher avec le solde du compte 571\n• Vérifier la présence de signataires désignés",
  tr_5: "Analyse de la variation de trésorerie :\n• Comparer trésorerie N vs N-1\n• Identifier les flux significatifs\n• Vérifier la cohérence avec le TAFIRE et l'activité",
  tr_6: "Soldes anormaux :\n• Vérifier l'absence de soldes créditeurs de caisse\n• Analyser tout solde anormal\n• Obtenir justification si nécessaire",

  ea_4: "Cohérence comptes/tableaux annexes :\n• T1&T2 (annexe 18&19/28)\n• T4 provisions (annexe 21/28)\n• T9 données sur 5 exercices (annexe 26/28)\n• T10 affectation résultat (annexe 27/28)\n• T11 effectifs (annexe 28/28)",
};
