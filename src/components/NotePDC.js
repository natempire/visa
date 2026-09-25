import React, { useState, useEffect } from 'react';
import { Sparkles, Edit2, Check, X, RefreshCw, Wand2, Lock, Unlock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SECTIONS_PDC } from '../utils/pdcData';
import { api } from '../utils/api';

function getValeur(val) {
  if (!val) return '';
  if (typeof val === 'object') {
    let r = val.reponse || '';
    if (val.detail) r += ' — ' + val.detail;
    return r;
  }
  return String(val);
}

function construireSectionsPourIA(pdcData) {
  return SECTIONS_PDC.map((section) => ({
    numero: section.numero,
    label: section.label,
    items: section.questions.map((q) => {
      const val = pdcData[q.id];
      return {
        question: q.label,
        reponse: getValeur(val),
        commentaire: (val && typeof val === 'object') ? val.commentaire : undefined,
      };
    }),
  }));
}

function genererNoteAuto(dossier, pdcData) {
  const get = (id) => getValeur(pdcData[id]);

  const denomination = get('denomination') || dossier.nomEntite || '';
  const formeJuridique = get('forme_juridique') || '';
  const dateCreation = get('date_creation') ? `créée le ${get('date_creation')}` : '';
  const activitePrincipale = get('activite_principale') || '';
  const produits = get('produits_services') || '';
  const marches = get('marches_geographiques') || '';
  const dirigeants = get('dirigeants') || '';
  const referentiel = get('referentiel_comptable') || 'SYSCOHADA Révisé';
  const logiciel = get('logiciel_comptable') || '';
  const compta = get('compta_interne_externe') || '';
  const rapprochements = get('rapprochements_bancaires') || '';
  const litiges = get('litiges') || '';
  const risques = get('risques_specifiques') || '';
  const dependance = get('dependance_economique') || '';
  const organigramme = get('organigramme') || '';
  const separationTaches = get('separation_taches') || '';

  let note = '';

  // Paragraphe 1 — Présentation
  if (denomination) {
    note += `${denomination}`;
    if (formeJuridique) note += ` est une ${formeJuridique}`;
    if (dateCreation) note += ` ${dateCreation}`;
    note += '.';
    if (activitePrincipale) note += ` Elle exerce principalement dans ${activitePrincipale.toLowerCase()}.`;
    if (produits) note += ` Ses principaux produits et services sont : ${produits}.`;
    if (marches) note += ` L'entité opère sur les marchés suivants : ${marches}.`;
    note += '\n\n';
  }

  // Paragraphe 2 — Risques
  const risquesIdentifies = [];
  if (litiges && litiges.toLowerCase().includes('oui')) risquesIdentifies.push('des litiges ou contentieux en cours');
  if (risques && risques.toLowerCase().includes('oui')) risquesIdentifies.push('des risques spécifiques liés à l\'activité');
  if (dependance && dependance.toLowerCase().includes('oui')) risquesIdentifies.push('une dépendance économique significative');

  if (risquesIdentifies.length > 0) {
    note += `Sur le plan des risques, l'entité présente ${risquesIdentifies.join(', ')}. Ces éléments devront faire l'objet d'une attention particulière lors des diligences.\n\n`;
  } else if (litiges || risques) {
    note += `Aucun risque significatif (litiges, dépendance économique, risques de marché) n'a été identifié à ce stade.\n\n`;
  }

  // Paragraphe 3 — Organisation comptable
  let orgCompta = 'L\'organisation comptable de l\'entité';
  if (referentiel) orgCompta += ` repose sur le référentiel ${referentiel}`;
  if (logiciel) orgCompta += `, avec l'utilisation du logiciel ${logiciel}`;
  if (compta) orgCompta += `. La comptabilité est ${compta.toLowerCase()}`;
  orgCompta += '.';

  if (rapprochements) {
    const rapp = rapprochements.toLowerCase().includes('oui') ? 'Les rapprochements bancaires sont effectués régulièrement.' : 'Les rapprochements bancaires ne semblent pas être effectués régulièrement — point de vigilance.';
    orgCompta += ' ' + rapp;
  }
  if (separationTaches) {
    const sep = separationTaches.toLowerCase().includes('oui') ? ' Une séparation des tâches est en place.' : ' Absence de séparation des tâches formalisée — risque de contrôle interne à évaluer.';
    orgCompta += sep;
  }

  note += orgCompta;

  return note.trim();
}

export default function NotePDC({ dossier }) {
  const { mettreAJourDossierComplet, ajouterHistorique, utilisateurConnecte } = useApp();
  const [editing, setEditing] = useState(false);
  const [texte, setTexte] = useState('');
  const [generatingIA, setGeneratingIA] = useState(false);
  const [erreurIA, setErreurIA] = useState('');

  const pdcData = dossier.etapes?.prise_de_connaissance?.pdcReponses || {};
  const noteEnregistree = dossier.notePDC || '';
  const noteAuto = genererNoteAuto(dossier, pdcData);
  const estVerrouillee = !!dossier.notePDCVerrouillee;
  const estAdmin = utilisateurConnecte?.role === 'admin';

  useEffect(() => {
    setTexte(noteEnregistree || noteAuto);
  }, [dossier.id]);

  const sauvegarder = async () => {
    await mettreAJourDossierComplet(dossier.id, { notePDC: texte });
    ajouterHistorique(dossier.id, 'Note de prise de connaissance modifiée');
    setEditing(false);
  };

  const regenerer = () => {
    setTexte(noteAuto);
  };

  const genererAvecIA = async () => {
    setGeneratingIA(true);
    setErreurIA('');
    try {
      const sections = construireSectionsPourIA(pdcData);
      const { texte: texteIA } = await api.genererNotePDCIA(dossier.nomEntite, sections);
      setTexte(texteIA);
      setEditing(true);
      // Persist immediately — this is a paid IA call, it must not be lost if the
      // user navigates away before manually clicking "Sauvegarder". Locks the note in
      // the same call: once generated, only an admin can trigger it again (avoids
      // burning the paid IA call a second time on an already-good note).
      await mettreAJourDossierComplet(dossier.id, { notePDC: texteIA, notePDCVerrouillee: true });
      ajouterHistorique(dossier.id, 'Note de prise de connaissance générée avec l\'IA');
    } catch (e) {
      setErreurIA(e.message || 'Erreur lors de la génération IA');
    }
    setGeneratingIA(false);
  };

  const deverrouiller = async () => {
    if (!window.confirm('Déverrouiller la note ? Elle pourra être régénérée avec l\'IA (nouvel appel payant).')) return;
    await mettreAJourDossierComplet(dossier.id, { notePDCVerrouillee: false });
    ajouterHistorique(dossier.id, 'Verrou de la note PDC levé (admin)');
  };

  const hasPDCData = Object.keys(pdcData).length > 0;

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={14} color="var(--gold)" />
          <h3>Note de prise de connaissance</h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!editing && (
            <>
              {estVerrouillee && (
                <span className="badge" style={{ background: '#f1f3f8', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }} title="Déjà générée avec l'IA — verrouillée pour éviter un nouvel appel payant">
                  <Lock size={10} /> Déjà généré
                </span>
              )}
              {hasPDCData && !estVerrouillee && (
                <button className="btn btn-outline btn-sm" onClick={regenerer} title="Régénérer depuis le PDC (modèle simple)">
                  <RefreshCw size={11} />
                </button>
              )}
              {hasPDCData && !estVerrouillee && (
                <button className="btn btn-outline btn-sm" onClick={genererAvecIA} disabled={generatingIA} title="Générer une note approfondie avec l'IA (risques inhérents et de contrôle interne)">
                  <Wand2 size={11} /> {generatingIA ? 'Génération…' : 'Générer avec IA'}
                </button>
              )}
              {estVerrouillee && estAdmin && (
                <button className="btn btn-outline btn-sm" onClick={deverrouiller} title="Déverrouiller (admin) pour permettre une nouvelle génération IA">
                  <Unlock size={11} /> Déverrouiller
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                <Edit2 size={11} /> Modifier
              </button>
            </>
          )}
          {editing && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => { setTexte(noteEnregistree || noteAuto); setEditing(false); }}>
                <X size={11} />
              </button>
              <button className="btn btn-primary btn-sm" onClick={sauvegarder}>
                <Check size={11} /> Sauvegarder
              </button>
            </>
          )}
        </div>
      </div>

      {erreurIA && (
        <div style={{ margin: '0 20px', marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#b91c1c' }}>
          {erreurIA}
        </div>
      )}

      <div style={{ padding: '14px 20px' }}>
        {!hasPDCData && !noteEnregistree ? (
          <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
            Complétez l'étape "Prise de connaissance" pour générer automatiquement cette note.
          </div>
        ) : editing ? (
          <textarea
            value={texte}
            onChange={e => setTexte(e.target.value)}
            style={{
              width: '100%', minHeight: 220, fontSize: 13, lineHeight: 1.7,
              border: '1.5px solid var(--navy)', borderRadius: 8, padding: '12px 14px',
              fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap', maxWidth: 760 }}>
            {texte || noteAuto}
          </div>
        )}
      </div>
    </div>
  );
}
