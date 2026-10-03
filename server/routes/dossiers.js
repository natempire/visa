const express = require('express');
const { query, queryOne, run } = require('../db');
const { authentifier } = require('./auth');
const { ROLES_NIVEAU } = require('../roles');
const { dossierAccessible } = require('../utils/dossierAccess');
const { requireRole } = require('../utils/requireRole');
const {
  CHAMPS_RESERVES_NON_ASSISTANT,
  ETAPES_ROLE_MIN,
  verifierDeverrouillageNotePDC,
  verifierChampsReserves,
  verifierRoleEtape,
} = require('../utils/dossierWriteRules');
const { DOCUMENTS_REQUIS, CYCLES_DILIGENCES } = require('../../src/utils/diligencesData');

const router = express.Router();

// Ordre réel des étapes du workflow (mêmes clés que ETAPES_ROLE_MIN, dans le même ordre que
// src/context/AppContext.js's ETAPES) — utilisé pour dériver etapeActuelle côté serveur.
const ETAPES_ORDRE = Object.keys(ETAPES_ROLE_MIN);

function parseDossier(row) {
  if (!row) return null;
  return {
    id: row.id,
    nomEntite: row.nom_entite,
    nccEntite: row.ncc_entite,
    adresseEntite: row.adresse_entite,
    exercice: row.exercice,
    nomGerant: row.nom_gerant,
    chiffreAffaires: row.chiffre_affaires,
    nombreHeures: row.nombre_heures,
    montantHonoraires: row.montant_honoraires,
    totalBilan: row.total_bilan,
    capitauxPropres: row.capitaux_propres,
    resultatNet: row.resultat_net,
    totalProduits: row.total_produits,
    nomExpert: row.nom_expert,
    nomAssistant: row.nom_assistant,
    planning: row.planning,
    listeDocuments: row.liste_documents,
    statut: row.statut,
    dateCreation: row.date_creation,
    creePar: row.cree_par,
    etapeActuelle: row.etape_actuelle,
    etapes: safeJSON(row.etapes_json, {}),
    cyclesAssignations: safeJSON(row.cycles_assignations_json, {}),
    cyclesReponses: safeJSON(row.cycles_reponses_json, {}),
    documentsRecus: safeJSON(row.documents_recus_json, {}),
    historique: safeJSON(row.historique_json, []),
    documentsGeneres: safeJSON(row.documents_generes_json, {}),
    documentsRequisPersonnalises: safeJSON(row.documents_requis_perso_json, []),
    notePDC: row.note_pdc || '',
    notePDCVerrouillee: !!row.note_pdc_verrouillee,
    collaborateurs: [],
  };
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str || '{}'); } catch { return fallback; }
}

function enrichWithCollaborateurs(dossier) {
  if (!dossier) return null;
  const collabs = query(
    'SELECT utilisateur_id as id FROM collaborateurs_dossier WHERE dossier_id = ?',
    [dossier.id]
  );
  dossier.collaborateurs = collabs.map(c => c.id);
  return dossier;
}

// Relit le dossier à jour et le renvoie — utilisé après chaque écriture ci-dessous pour que
// la réponse reflète toujours l'état réellement persisté, pas une reconstruction locale.
function renvoyerDossierMaj(req, res) {
  const updated = queryOne('SELECT * FROM dossiers WHERE id = ?', [req.params.id]);
  res.json(enrichWithCollaborateurs(parseDossier(updated)));
}

function libelleCycle(cycleId) {
  return CYCLES_DILIGENCES.find(c => c.id === cycleId)?.label || cycleId;
}

// Ajoute une entrée à l'historique (plafonné à 50) en utilisant le nom réel de l'utilisateur
// authentifié — jamais une valeur réclamée par le client, contrairement à l'ancien PUT qui
// faisait confiance à `utilisateurConnecte?.nom` envoyé depuis le navigateur.
function appendHistorique(historiqueActuel, action, userId) {
  const auteurRow = queryOne('SELECT nom FROM utilisateurs WHERE id = ?', [userId]);
  return [...historiqueActuel, {
    action,
    auteur: auteurRow?.nom || 'Inconnu',
    date: new Date().toISOString(),
  }].slice(-50);
}

// GET /api/dossiers — dossiers de l'utilisateur connecté
router.get('/', authentifier, (req, res) => {
  try {
    let rows;
    if (ROLES_NIVEAU[req.userRole] >= ROLES_NIVEAU.expert) {
      // Expert et admin voient tous les dossiers
      rows = query(`SELECT * FROM dossiers ORDER BY date_creation DESC`);
    } else {
      // Les autres voient uniquement leurs dossiers
      rows = query(`
        SELECT d.* FROM dossiers d
        INNER JOIN collaborateurs_dossier cd ON d.id = cd.dossier_id
        WHERE cd.utilisateur_id = ?
        ORDER BY d.date_creation DESC
      `, [req.userId]);
    }
    const dossiers = rows.map(r => enrichWithCollaborateurs(parseDossier(r)));
    res.json(dossiers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// GET /api/dossiers/:id
router.get('/:id', authentifier, (req, res) => {
  try {
    const row = dossierAccessible(req.params.id, req.userId, req.userRole);

    if (!row) return res.status(404).json({ erreur: 'Dossier non trouvé' });
    res.json(enrichWithCollaborateurs(parseDossier(row)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/dossiers — créer un dossier
router.post('/', authentifier, requireRole('senior'), (req, res) => {
  try {
    const d = req.body;
    if (!d.nomEntite || !d.nccEntite || !d.exercice) {
      return res.status(400).json({ erreur: 'Nom entité, NCC et exercice requis' });
    }

    const id = Date.now().toString();
    const now = new Date().toISOString();

    // Init étapes
    const etapesInitiales = {};
    ETAPES_ORDRE.forEach(cle => {
      etapesInitiales[cle] = { statut: 'non_commence', commentaires: [], completePar: null, dateComplete: null };
    });

    run(`INSERT INTO dossiers (
      id, nom_entite, ncc_entite, adresse_entite, exercice, nom_gerant,
      chiffre_affaires, nombre_heures, montant_honoraires, total_bilan,
      capitaux_propres, resultat_net, total_produits, nom_expert, nom_assistant,
      planning, liste_documents, statut, date_creation, cree_par, etape_actuelle,
      etapes_json, cycles_assignations_json, cycles_reponses_json, documents_recus_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, d.nomEntite, d.nccEntite, d.adresseEntite||'', d.exercice, d.nomGerant||'',
      d.chiffreAffaires||'', d.nombreHeures||'', d.montantHonoraires||'', d.totalBilan||'',
      d.capitauxPropres||'', d.resultatNet||'', d.totalProduits||'', d.nomExpert||'Bamba Souleymane',
      d.nomAssistant||'', d.planning||'', d.listeDocuments||'', 'en_cours', now, req.userId, 1,
      JSON.stringify(etapesInitiales), '{}', '{}', '{}'
    ]);

    run('INSERT INTO collaborateurs_dossier (dossier_id, utilisateur_id) VALUES (?, ?)', [id, req.userId]);

    // Create folder structure on server
    try {
      const { creerStructureDossier } = require('./fichiers');
      creerStructureDossier(id);
    } catch(e) { console.error('Folder creation error:', e); }

    const nouveau = queryOne('SELECT * FROM dossiers WHERE id = ?', [id]);
    res.status(201).json(enrichWithCollaborateurs(parseDossier(nouveau)));

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PATCH /api/dossiers/:id/info — champs "Modifier les données" (DossierDetail.js), jamais
// cyclesReponses/etapes/etc. Chaque champ ci-dessous ne touche QUE sa propre colonne.
router.patch('/:id/info', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const d = req.body;
    const refus = verifierChampsReserves(d, dossier, req.userRole);
    if (refus) return res.status(403).json({ erreur: refus });

    const CHAMPS = [
      ['nomGerant', 'nom_gerant'], ['nomAssistant', 'nom_assistant'],
      ['planning', 'planning'], ['listeDocuments', 'liste_documents'],
      ['chiffreAffaires', 'chiffre_affaires'], ['nombreHeures', 'nombre_heures'],
      ['montantHonoraires', 'montant_honoraires'], ['totalBilan', 'total_bilan'],
      ['capitauxPropres', 'capitaux_propres'], ['resultatNet', 'resultat_net'],
      ['totalProduits', 'total_produits'],
    ];
    const colonnes = [];
    const valeurs = [];
    for (const [jsField, sqlField] of CHAMPS) {
      if (d[jsField] !== undefined) {
        colonnes.push(`${sqlField}=?`);
        valeurs.push(d[jsField]);
      }
    }
    if (colonnes.length === 0) return res.status(400).json({ erreur: 'Aucun champ à mettre à jour' });

    run(`UPDATE dossiers SET ${colonnes.join(', ')} WHERE id=?`, [...valeurs, req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PATCH /api/dossiers/:id/etapes/:cle — fusionne `donnees` dans etapes[cle] et recalcule
// etapeActuelle côté serveur (plutôt que de faire confiance à une valeur calculée côté
// client, comme le faisait l'ancien PUT).
router.patch('/:id/etapes/:cle', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const { donnees, historique: messageHistorique } = req.body;
    if (!donnees || typeof donnees !== 'object') {
      return res.status(400).json({ erreur: 'donnees requis' });
    }

    const etapes = safeJSON(dossier.etapes_json, {});
    const ancienneEtape = etapes[req.params.cle] || {};
    const nouvelleEtape = { ...ancienneEtape, ...donnees };

    const refus = verifierRoleEtape(req.params.cle, ancienneEtape, nouvelleEtape, req.userRole);
    if (refus) return res.status(403).json({ erreur: refus });

    const etapesMaj = { ...etapes, [req.params.cle]: nouvelleEtape };

    let etapeActuelle = 1;
    ETAPES_ORDRE.forEach((cle, i) => {
      if (['complete', 'valide'].includes(etapesMaj[cle]?.statut)) {
        etapeActuelle = Math.min(i + 2, ETAPES_ORDRE.length);
      }
    });

    let historiqueMaj = safeJSON(dossier.historique_json, []);
    if (messageHistorique) historiqueMaj = appendHistorique(historiqueMaj, messageHistorique, req.userId);

    run('UPDATE dossiers SET etapes_json=?, etape_actuelle=?, historique_json=? WHERE id=?',
      [JSON.stringify(etapesMaj), etapeActuelle, JSON.stringify(historiqueMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PATCH /api/dossiers/:id/cycles/:cycleId/assignation
router.patch('/:id/cycles/:cycleId/assignation', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const { utilisateurId } = req.body;
    if (!utilisateurId) return res.status(400).json({ erreur: 'utilisateurId requis' });

    const assignations = { ...safeJSON(dossier.cycles_assignations_json, {}), [req.params.cycleId]: utilisateurId };

    run('UPDATE dossiers SET cycles_assignations_json=? WHERE id=?', [JSON.stringify(assignations), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PATCH /api/dossiers/:id/cycles/:cycleId/points/:pointId — fusionne des champs dans un seul
// point d'un seul cycle. C'est LE point central de ce changement : deux collaborateurs
// travaillant deux cycles différents (ou deux points différents) ne s'écrasent plus jamais,
// puisque chaque requête ne lit/réécrit que cette seule clé imbriquée, fraîchement relue en
// base à chaque fois — jamais une copie mise en cache côté client.
router.patch('/:id/cycles/:cycleId/points/:pointId', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const donnees = req.body;
    if (!donnees || typeof donnees !== 'object') {
      return res.status(400).json({ erreur: 'Corps de requête invalide' });
    }

    const cyclesReponses = safeJSON(dossier.cycles_reponses_json, {});
    const cycleActuel = cyclesReponses[req.params.cycleId] || {};
    const points = cycleActuel.points || {};
    const pointMaj = { ...(points[req.params.pointId] || {}), ...donnees };

    const cyclesReponsesMaj = {
      ...cyclesReponses,
      [req.params.cycleId]: { ...cycleActuel, points: { ...points, [req.params.pointId]: pointMaj } },
    };

    run('UPDATE dossiers SET cycles_reponses_json=? WHERE id=?', [JSON.stringify(cyclesReponsesMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/dossiers/:id/cycles/:cycleId/signature — body { type: 'fait' | 'supervise' }.
// Utilise req.userId (authentifié) plutôt qu'un id réclamé par le client.
router.post('/:id/cycles/:cycleId/signature', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const { type } = req.body;
    if (!['fait', 'supervise'].includes(type)) {
      return res.status(400).json({ erreur: 'type doit être "fait" ou "supervise"' });
    }

    const cyclesReponses = safeJSON(dossier.cycles_reponses_json, {});
    const cycleActuel = cyclesReponses[req.params.cycleId] || {};
    const maintenant = new Date().toISOString();
    const cycleMaj = type === 'fait'
      ? { ...cycleActuel, faitPar: req.userId, dateFait: maintenant }
      : { ...cycleActuel, supervise: req.userId, dateSupervise: maintenant };

    const cyclesReponsesMaj = { ...cyclesReponses, [req.params.cycleId]: cycleMaj };
    const message = type === 'fait'
      ? `Cycle "${libelleCycle(req.params.cycleId)}" signé (fait)`
      : `Cycle "${libelleCycle(req.params.cycleId)}" supervisé`;
    const historiqueMaj = appendHistorique(safeJSON(dossier.historique_json, []), message, req.userId);

    run('UPDATE dossiers SET cycles_reponses_json=?, historique_json=? WHERE id=?',
      [JSON.stringify(cyclesReponsesMaj), JSON.stringify(historiqueMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /api/dossiers/:id/cycles/:cycleId/signature — annule la supervision.
router.delete('/:id/cycles/:cycleId/signature', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const cyclesReponses = safeJSON(dossier.cycles_reponses_json, {});
    const cycleMaj = { ...(cyclesReponses[req.params.cycleId] || {}) };
    delete cycleMaj.supervise;
    delete cycleMaj.dateSupervise;

    const cyclesReponsesMaj = { ...cyclesReponses, [req.params.cycleId]: cycleMaj };
    const message = `Supervision du cycle "${libelleCycle(req.params.cycleId)}" annulée`;
    const historiqueMaj = appendHistorique(safeJSON(dossier.historique_json, []), message, req.userId);

    run('UPDATE dossiers SET cycles_reponses_json=?, historique_json=? WHERE id=?',
      [JSON.stringify(cyclesReponsesMaj), JSON.stringify(historiqueMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PATCH /api/dossiers/:id/cycles/propositions — applique en un seul appel les propositions
// IA sur potentiellement plusieurs points/cycles à la fois (un seul read + un seul write).
router.patch('/:id/cycles/propositions', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const { propositions, historique: messageHistorique } = req.body;
    if (!Array.isArray(propositions)) {
      return res.status(400).json({ erreur: 'propositions doit être un tableau' });
    }

    const cyclesReponses = safeJSON(dossier.cycles_reponses_json, {});
    const date = new Date().toISOString();
    for (const { pointId, cycleId, statut, justification } of propositions) {
      const cycleActuel = cyclesReponses[cycleId] || {};
      const points = cycleActuel.points || {};
      const pointActuel = points[pointId] || {};
      cyclesReponses[cycleId] = {
        ...cycleActuel,
        points: { ...points, [pointId]: { ...pointActuel, propositionIA: { statut, justification, date } } },
      };
    }

    let historiqueMaj = safeJSON(dossier.historique_json, []);
    if (messageHistorique) historiqueMaj = appendHistorique(historiqueMaj, messageHistorique, req.userId);

    run('UPDATE dossiers SET cycles_reponses_json=?, historique_json=? WHERE id=?',
      [JSON.stringify(cyclesReponses), JSON.stringify(historiqueMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PATCH /api/dossiers/:id/documents-recus/:docId
router.patch('/:id/documents-recus/:docId', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const { statut } = req.body;
    if (!statut) return res.status(400).json({ erreur: 'statut requis' });

    const documentsRecus = { ...safeJSON(dossier.documents_recus_json, {}), [req.params.docId]: statut };

    let historiqueMaj = safeJSON(dossier.historique_json, []);
    if (statut === 'ok') {
      const personnalises = safeJSON(dossier.documents_requis_perso_json, []);
      const docNom = DOCUMENTS_REQUIS.find(doc => doc.id === req.params.docId)?.nom
        || personnalises.find(doc => doc.id === req.params.docId)?.nom
        || req.params.docId;
      historiqueMaj = appendHistorique(historiqueMaj, `Document reçu : "${docNom}"`, req.userId);
    }

    run('UPDATE dossiers SET documents_recus_json=?, historique_json=? WHERE id=?',
      [JSON.stringify(documentsRecus), JSON.stringify(historiqueMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/dossiers/:id/documents-personnalises — ajoute un document requis personnalisé.
router.post('/:id/documents-personnalises', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const { nom } = req.body;
    if (!nom) return res.status(400).json({ erreur: 'nom requis' });

    const nouveauDoc = { id: `custom_${Date.now()}`, nom };
    const documentsRequisPersonnalises = [...safeJSON(dossier.documents_requis_perso_json, []), nouveauDoc];
    const historiqueMaj = appendHistorique(safeJSON(dossier.historique_json, []), `Document ajouté à la liste : "${nom}"`, req.userId);

    run('UPDATE dossiers SET documents_requis_perso_json=?, historique_json=? WHERE id=?',
      [JSON.stringify(documentsRequisPersonnalises), JSON.stringify(historiqueMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /api/dossiers/:id/documents-personnalises/:docId
router.delete('/:id/documents-personnalises/:docId', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const personnalises = safeJSON(dossier.documents_requis_perso_json, []);
    const doc = personnalises.find(d => d.id === req.params.docId);
    const documentsRequisPersonnalises = personnalises.filter(d => d.id !== req.params.docId);
    const documentsRecus = { ...safeJSON(dossier.documents_recus_json, {}) };
    delete documentsRecus[req.params.docId];

    let historiqueMaj = safeJSON(dossier.historique_json, []);
    if (doc) historiqueMaj = appendHistorique(historiqueMaj, `Document retiré de la liste : "${doc.nom}"`, req.userId);

    run('UPDATE dossiers SET documents_requis_perso_json=?, documents_recus_json=?, historique_json=? WHERE id=?',
      [JSON.stringify(documentsRequisPersonnalises), JSON.stringify(documentsRecus), JSON.stringify(historiqueMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PATCH /api/dossiers/:id/note-pdc — body { notePDC?, notePDCVerrouillee? }.
router.patch('/:id/note-pdc', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const { notePDC, notePDCVerrouillee } = req.body;
    const refus = verifierDeverrouillageNotePDC(notePDCVerrouillee, dossier, req.userRole);
    if (refus) return res.status(403).json({ erreur: refus });

    const colonnes = [];
    const valeurs = [];
    if (notePDC !== undefined) { colonnes.push('note_pdc=?'); valeurs.push(notePDC); }
    if (notePDCVerrouillee !== undefined) { colonnes.push('note_pdc_verrouillee=?'); valeurs.push(notePDCVerrouillee ? 1 : 0); }
    if (colonnes.length === 0) return res.status(400).json({ erreur: 'Aucun champ à mettre à jour' });

    run(`UPDATE dossiers SET ${colonnes.join(', ')} WHERE id=?`, [...valeurs, req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// PATCH /api/dossiers/:id/documents-generes/:docType — body { genereLe, generePar, nomFichier }.
router.patch('/:id/documents-generes/:docType', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const documentsGeneres = { ...safeJSON(dossier.documents_generes_json, {}), [req.params.docType]: req.body };

    run('UPDATE dossiers SET documents_generes_json=? WHERE id=?', [JSON.stringify(documentsGeneres), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/dossiers/:id/historique — ajoute une entrée d'historique autonome (ex: export
// Excel) sans toucher aucun autre champ.
router.post('/:id/historique', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const { action } = req.body;
    if (!action) return res.status(400).json({ erreur: 'action requis' });

    const historiqueMaj = appendHistorique(safeJSON(dossier.historique_json, []), action, req.userId);

    run('UPDATE dossiers SET historique_json=? WHERE id=?', [JSON.stringify(historiqueMaj), req.params.id]);
    renvoyerDossierMaj(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/dossiers/:id/collaborateurs — ajouter un collaborateur
router.post('/:id/collaborateurs', authentifier, requireRole('senior'), (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ erreur: 'userId requis' });

    // Check dossier exists - expert/admin can access all dossiers
    const dossierExiste = queryOne('SELECT id FROM dossiers WHERE id=?', [req.params.id]);
    if (!dossierExiste) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    // Seniors must be a member of the dossier; expert/admin bypass this check.
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.expert) {
      const member = queryOne(
        'SELECT 1 FROM collaborateurs_dossier WHERE dossier_id=? AND utilisateur_id=?',
        [req.params.id, req.userId]
      );
      if (!member) return res.status(403).json({ erreur: 'Accès non autorisé' });
    }

    // Check target user exists
    const target = queryOne('SELECT id FROM utilisateurs WHERE id=? AND actif=1', [userId]);
    if (!target) return res.status(404).json({ erreur: 'Utilisateur non trouvé' });

    run('INSERT OR IGNORE INTO collaborateurs_dossier (dossier_id, utilisateur_id) VALUES (?,?)',
      [req.params.id, userId]);

    renvoyerDossierMaj(req, res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /api/dossiers/:id/collaborateurs/:userId
router.delete('/:id/collaborateurs/:userId', authentifier, requireRole('senior'), (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    if (targetId === req.userId) {
      return res.status(400).json({ erreur: 'Vous ne pouvez pas vous retirer vous-même' });
    }
    run('DELETE FROM collaborateurs_dossier WHERE dossier_id=? AND utilisateur_id=?',
      [req.params.id, targetId]);
    const row = queryOne('SELECT * FROM dossiers WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ erreur: 'Dossier non trouvé' });
    res.json(enrichWithCollaborateurs(parseDossier(row)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /api/dossiers/:id — suppression définitive (admin uniquement)
router.delete('/:id', authentifier, requireRole('admin'), (req, res) => {
  try {
    const dossier = queryOne('SELECT * FROM dossiers WHERE id = ?', [req.params.id]);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    run('DELETE FROM collaborateurs_dossier WHERE dossier_id = ?', [req.params.id]);
    run('DELETE FROM dossiers WHERE id = ?', [req.params.id]);

    try {
      const { nomDossierServeur } = require('./fichiers');
      const fs = require('fs');
      const path = require('path');
      const dir = path.join(__dirname, '..', 'data', 'missions', nomDossierServeur(dossier));
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) { console.error('Erreur suppression dossier fichiers:', e); }

    res.json({ succes: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

module.exports = router;
