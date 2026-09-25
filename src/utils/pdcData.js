// Questionnaire de prise de connaissance - données complètes
// Types: 'text' | 'textarea' | 'date' | 'select' | 'oui_non' | 'oui_non_detail'

export const SECTIONS_PDC = [
  {
    id: 'infos_generales',
    label: 'Informations générales sur l\'entreprise',
    numero: 1,
    questions: [
      { id: 'denomination', label: 'Quelle est la dénomination sociale de l\'entreprise ?', type: 'text', obligatoire: true, justificatif: 'Statuts / RCCM' },
      { id: 'forme_juridique', label: 'Quelle est la forme juridique de l\'entité ?', type: 'select', options: ['SARL', 'SA', 'SAS', 'GIE', 'EI', 'SNC', 'Autre'], obligatoire: true, justificatif: 'Statuts' },
      { id: 'date_creation', label: 'Quelle est la date de création de l\'entreprise ?', type: 'date', obligatoire: true, justificatif: 'RCCM' },
      { id: 'adresse_siege', label: 'Quelle est l\'adresse du siège social ?', type: 'text', obligatoire: true, justificatif: 'Facture d\'électricité / bail' },
      { id: 'dirigeants', label: 'Qui sont les principaux dirigeants ?', type: 'textarea', obligatoire: true, justificatif: 'Organigramme / PV AG' },
      { id: 'actionnaires', label: 'Qui sont les principaux actionnaires ou associés ?', type: 'textarea', obligatoire: false, justificatif: 'Registre des associés / statuts' },
      { id: 'appartient_groupe', label: 'L\'entreprise appartient-elle à un groupe ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Organigramme du groupe' },
      { id: 'parties_liees', label: 'Existe-t-il des parties liées significatives ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Liste des parties liées' },
    ]
  },
  {
    id: 'activite_environnement',
    label: 'Activité et environnement économique',
    numero: 2,
    questions: [
      { id: 'activite_principale', label: 'Quelle est l\'activité principale de l\'entreprise ?', type: 'textarea', obligatoire: true, justificatif: 'Statuts / rapport de gestion' },
      { id: 'activites_secondaires', label: 'Quelles sont les activités secondaires ?', type: 'textarea', obligatoire: false, justificatif: 'Documents internes' },
      { id: 'produits_services', label: 'Quels sont les principaux produits ou services ?', type: 'textarea', obligatoire: true, justificatif: 'Catalogue / factures' },
      { id: 'principaux_clients', label: 'Qui sont les principaux clients ?', type: 'textarea', obligatoire: false, justificatif: 'Balance clients' },
      { id: 'principaux_fournisseurs', label: 'Qui sont les principaux fournisseurs ?', type: 'textarea', obligatoire: false, justificatif: 'Balance fournisseurs' },
      { id: 'marches_geographiques', label: 'Sur quels marchés géographiques opère l\'entreprise ?', type: 'text', obligatoire: false, justificatif: 'Contrats / rapports' },
      { id: 'dependance_economique', label: 'Existe-t-il une dépendance économique (client/fournisseur) ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Analyse CA' },
      { id: 'reglementations', label: 'Quelles sont les principales réglementations applicables ?', type: 'textarea', obligatoire: false, justificatif: 'Textes réglementaires' },
      { id: 'risques_specifiques', label: 'L\'entreprise est-elle soumise à des risques spécifiques (marché, change, crédit) ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Études internes' },
      { id: 'litiges', label: 'Y a-t-il des litiges ou contentieux en cours ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Correspondance juridique' },
    ]
  },
  {
    id: 'organisation_gouvernance',
    label: 'Organisation et gouvernance',
    numero: 3,
    questions: [
      { id: 'organigramme', label: 'Existe-t-il un organigramme formalisé ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Organigramme' },
      { id: 'principales_fonctions', label: 'Quelles sont les principales fonctions (DG, finance, production, etc.) ?', type: 'textarea', obligatoire: false, justificatif: 'Fiches de poste' },
      { id: 'separation_taches', label: 'Existe-t-il une séparation des tâches (contrôle interne) ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Manuel de procédures' },
      { id: 'responsable_compta', label: 'Qui est responsable de la fonction comptable ?', type: 'text', obligatoire: true, justificatif: 'Décision interne' },
      { id: 'audit_interne', label: 'Existe-t-il un service d\'audit interne ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Rapports d\'audit' },
      { id: 'decisions_strategiques', label: 'Comment sont prises les décisions stratégiques ?', type: 'textarea', obligatoire: false, justificatif: 'PV CA / AG' },
    ]
  },
  {
    id: 'organisation_comptable',
    label: 'Organisation comptable et financière',
    numero: 4,
    questions: [
      { id: 'referentiel_comptable', label: 'Quel est le référentiel comptable appliqué ?', type: 'select', options: ['SYSCOHADA Révisé', 'IFRS', 'Autre'], obligatoire: true, justificatif: 'États financiers' },
      { id: 'logiciel_comptable', label: 'Quel est le logiciel comptable utilisé ?', type: 'text', obligatoire: true, justificatif: 'Contrat logiciel' },
      { id: 'compta_interne_externe', label: 'La comptabilité est-elle internalisée ou externalisée ?', type: 'select', options: ['Internalisée', 'Externalisée', 'Mixte'], obligatoire: true, justificatif: 'Contrat prestataire' },
      { id: 'manuel_procedures', label: 'Existe-t-il un manuel de procédures comptables ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Manuel' },
      { id: 'enregistrement_operations', label: 'Comment sont enregistrées les opérations (journaux, périodicité) ?', type: 'textarea', obligatoire: false, justificatif: 'Journaux comptables' },
      { id: 'validation_ecritures', label: 'Qui valide les écritures comptables ?', type: 'text', obligatoire: true, justificatif: 'Procédures internes' },
      { id: 'calendrier_cloture', label: 'Existe-t-il un calendrier de clôture ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Planning' },
      { id: 'gestion_immobilisations', label: 'Comment sont traitées les immobilisations ?', type: 'textarea', obligatoire: false, justificatif: 'Fichier des immobilisations' },
      { id: 'gestion_tresorerie', label: 'Comment est assurée la gestion de la trésorerie ?', type: 'textarea', obligatoire: false, justificatif: 'Rapprochements bancaires' },
      { id: 'rapprochements_bancaires', label: 'Les rapprochements bancaires sont-ils effectués régulièrement ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'États de rapprochement' },
      { id: 'gestion_stocks', label: 'Comment sont gérés les stocks ?', type: 'textarea', obligatoire: false, justificatif: 'Inventaires / fiches de stock' },
      { id: 'controles_internes_cycles', label: 'Existe-t-il des contrôles internes sur les cycles (achat, vente, paie) ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Procédures' },
      { id: 'etats_finances_audites', label: 'Les états financiers sont-ils audités ?', type: 'oui_non_detail', obligatoire: false, justificatif: 'Rapports d\'audit' },
    ]
  },
  {
    id: 'systeme_information',
    label: 'Système d\'information et contrôle interne',
    numero: 5,
    questions: [
      { id: 'systemes_info', label: 'Quels sont les systèmes d\'information utilisés ?', type: 'textarea', obligatoire: false, justificatif: 'Documentation SI' },
      { id: 'controles_acces', label: 'Existe-t-il des contrôles d\'accès aux systèmes ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Politique sécurité' },
      { id: 'sauvegardes', label: 'Les données sont-elles sauvegardées régulièrement ?', type: 'oui_non_detail', obligatoire: true, justificatif: 'Procédure IT' },
      { id: 'plan_continuite', label: 'Existe-t-il un plan de continuité d\'activité ?', type: 'oui_non_detail', obligatoire: false, justificatif: 'PCA' },
      { id: 'incidents_informatiques', label: 'Des incidents informatiques ont-ils été constatés ?', type: 'oui_non_detail', obligatoire: false, justificatif: 'Rapports IT' },
    ]
  },
];

// Points de bouclage
export const POINTS_BOUCLAGE = [
  { id: 'b1', texte: 'Lettre de mission signée (ou actualisation)' },
  { id: 'b2', texte: 'Existence du versement d\'acompte de la part du client (au moins 50%)' },
  { id: 'b3', texte: 'Existence de RCCM, DFE, N° CNPS employeur' },
  { id: 'b4', texte: 'Existence de la revue fiscale (TVA, IS, 7,5% BNC & PSSI, BIC) et sociale à jour' },
  { id: 'b5', texte: 'Existence de l\'ETAT 301, 302, DISA' },
  { id: 'b6', texte: 'Existence de balance définitive N & N-1 (sous format Excel de préférence)' },
  { id: 'b7', texte: 'Existence de feuille de travail à jour du client' },
  { id: 'b8', texte: 'Existence des États Financiers Définitifs' },
];
