const express = require('express');
const { query, queryOne, run } = require('../db');
const { authentifier } = require('./auth');
const { ROLES_NIVEAU } = require('../roles');

const router = express.Router();

// Mirrors src/context/AppContext.js's ROLES/ETAPES — the UI already gates on these, but
// nothing enforced them server-side, so any authenticated collaborateur (any role) could
// call the API directly and edit fields or étapes their role has no business touching.
const ETAPES_ROLE_MIN = {
  prise_de_connaissance: 'assistant',
  lettre_de_mission: 'senior',
  demande_documents: 'assistant',
  diligences: 'assistant',
  note_synthese: 'senior',
  bouclage: 'expert',
  attestation: 'expert',
};
// Same fields gated behind "Modifier les données" (DossierDetail.js), hidden entirely
// from the assistant role in the UI.
const CHAMPS_RESERVES_NON_ASSISTANT = [
  ['nomGerant', 'nom_gerant'], ['nomAssistant', 'nom_assistant'], ['nomExpert', 'nom_expert'],
  ['planning', 'planning'], ['listeDocuments', 'liste_documents'],
  ['chiffreAffaires', 'chiffre_affaires'], ['nombreHeures', 'nombre_heures'],
  ['montantHonoraires', 'montant_honoraires'], ['totalBilan', 'total_bilan'],
  ['capitauxPropres', 'capitaux_propres'], ['resultatNet', 'resultat_net'],
  ['totalProduits', 'total_produits'],
];

// Returns an error message if `d` (the incoming PUT body) tries to change something the
// caller's role isn't allowed to touch, given `dossierRow` (the current DB row) — or null
// if the request is within the caller's rights.
function verifierAutorisationEcriture(d, dossierRow, userRole) {
  // Only admin can unlock a note PDC once it's been AI-generated and locked. Locking it
  // (false -> true) is allowed for anyone who can reach that action client-side.
  if (d.notePDCVerrouillee === false && !!dossierRow.note_pdc_verrouillee && userRole !== 'admin') {
    return 'Seul un administrateur peut déverrouiller une note de prise de connaissance déjà générée';
  }

  if (userRole !== 'assistant') return null; // senior/expert/admin pass the field-level check below

  for (const [jsField, sqlField] of CHAMPS_RESERVES_NON_ASSISTANT) {
    if (d[jsField] !== undefined && String(d[jsField]) !== String(dossierRow[sqlField] || '')) {
      return `Modification du champ "${jsField}" réservée aux rôles senior/expert`;
    }
  }

  if (d.etapes) {
    const etapesActuelles = safeJSON(dossierRow.etapes_json, {});
    for (const cle of Object.keys(d.etapes)) {
      const roleMin = ETAPES_ROLE_MIN[cle];
      if (!roleMin) continue;
      const inchangee = JSON.stringify(d.etapes[cle]) === JSON.stringify(etapesActuelles[cle]);
      if (inchangee) continue;
      if (ROLES_NIVEAU[userRole] < ROLES_NIVEAU[roleMin]) {
        return `Modification de l'étape "${cle}" réservée au rôle ${roleMin} ou supérieur`;
      }
    }
  }

  return null;
}

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

// Expert/admin peuvent voir et modifier n'importe quel dossier, comme sur la liste
// (GET /api/dossiers) — être collaborateur explicite n'est requis que pour senior/assistant.
// Sans ça, un expert/admin pouvait ouvrir un dossier où il n'est pas explicitement ajouté
// et voir ses données (via la liste), mais tout enregistrement échouait silencieusement.
function dossierAccessible(dossierId, userId, userRole) {
  if (ROLES_NIVEAU[userRole] >= ROLES_NIVEAU.expert) {
    return queryOne('SELECT * FROM dossiers WHERE id = ?', [dossierId]);
  }
  return queryOne(`
    SELECT d.* FROM dossiers d
    INNER JOIN collaborateurs_dossier cd ON d.id = cd.dossier_id
    WHERE d.id = ? AND cd.utilisateur_id = ?
  `, [dossierId, userId]);
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
router.post('/', authentifier, (req, res) => {
  try {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.senior) {
      return res.status(403).json({ erreur: 'Accès réservé aux seniors et experts' });
    }

    const d = req.body;
    if (!d.nomEntite || !d.nccEntite || !d.exercice) {
      return res.status(400).json({ erreur: 'Nom entité, NCC et exercice requis' });
    }

    const id = Date.now().toString();
    const now = new Date().toISOString();

    // Init étapes
    const etapesInitiales = {};
    const ETAPES = ['prise_de_connaissance','lettre_de_mission','demande_documents','diligences','note_synthese','bouclage','attestation'];
    ETAPES.forEach(cle => {
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

// PUT /api/dossiers/:id — mise à jour complète d'un dossier
router.put('/:id', authentifier, (req, res) => {
  try {
    const dossier = dossierAccessible(req.params.id, req.userId, req.userRole);
    if (!dossier) return res.status(404).json({ erreur: 'Dossier non trouvé' });

    const d = req.body;
    const refus = verifierAutorisationEcriture(d, dossier, req.userRole);
    if (refus) return res.status(403).json({ erreur: refus });

    run(`UPDATE dossiers SET
      nom_entite=?, ncc_entite=?, adresse_entite=?, nom_gerant=?,
      chiffre_affaires=?, nombre_heures=?, montant_honoraires=?,
      total_bilan=?, capitaux_propres=?, resultat_net=?, total_produits=?,
      nom_expert=?, nom_assistant=?, planning=?, liste_documents=?,
      etapes_json=?, cycles_assignations_json=?, cycles_reponses_json=?,
      documents_recus_json=?, historique_json=?, documents_generes_json=?,
      documents_requis_perso_json=?, note_pdc=?, note_pdc_verrouillee=?, etape_actuelle=?, statut=?
      WHERE id=?`,
    [
      d.nomEntite||dossier.nom_entite,
      d.nccEntite||dossier.ncc_entite,
      d.adresseEntite||dossier.adresse_entite||'',
      d.nomGerant||dossier.nom_gerant||'',
      d.chiffreAffaires||dossier.chiffre_affaires||'',
      d.nombreHeures||dossier.nombre_heures||'',
      d.montantHonoraires||dossier.montant_honoraires||'',
      d.totalBilan||dossier.total_bilan||'',
      d.capitauxPropres||dossier.capitaux_propres||'',
      d.resultatNet||dossier.resultat_net||'',
      d.totalProduits||dossier.total_produits||'',
      d.nomExpert||dossier.nom_expert||'',
      d.nomAssistant||dossier.nom_assistant||'',
      d.planning||dossier.planning||'',
      d.listeDocuments||dossier.liste_documents||'',
      JSON.stringify(d.etapes)||dossier.etapes_json,
      JSON.stringify(d.cyclesAssignations)||dossier.cycles_assignations_json,
      JSON.stringify(d.cyclesReponses)||dossier.cycles_reponses_json,
      JSON.stringify(d.documentsRecus)||dossier.documents_recus_json,
      JSON.stringify(d.historique)||dossier.historique_json,
      JSON.stringify(d.documentsGeneres)||dossier.documents_generes_json,
      JSON.stringify(d.documentsRequisPersonnalises)||dossier.documents_requis_perso_json,
      d.notePDC !== undefined ? d.notePDC : (dossier.note_pdc || ''),
      d.notePDCVerrouillee !== undefined ? (d.notePDCVerrouillee ? 1 : 0) : (dossier.note_pdc_verrouillee || 0),
      d.etapeActuelle||dossier.etape_actuelle,
      d.statut||dossier.statut,
      req.params.id
    ]);

    const updated = queryOne('SELECT * FROM dossiers WHERE id = ?', [req.params.id]);
    res.json(enrichWithCollaborateurs(parseDossier(updated)));

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// POST /api/dossiers/:id/collaborateurs — ajouter un collaborateur
router.post('/:id/collaborateurs', authentifier, (req, res) => {
  try {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.senior) {
      return res.status(403).json({ erreur: 'Accès non autorisé' });
    }
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

    const updated = queryOne('SELECT * FROM dossiers WHERE id = ?', [req.params.id]);
    res.json(enrichWithCollaborateurs(parseDossier(updated)));

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
  }
});

// DELETE /api/dossiers/:id/collaborateurs/:userId
router.delete('/:id/collaborateurs/:userId', authentifier, (req, res) => {
  try {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.senior) {
      return res.status(403).json({ erreur: 'Accès non autorisé' });
    }
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
router.delete('/:id', authentifier, (req, res) => {
  try {
    if (ROLES_NIVEAU[req.userRole] < ROLES_NIVEAU.admin) {
      return res.status(403).json({ erreur: 'Accès réservé aux administrateurs' });
    }
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