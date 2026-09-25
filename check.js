const {getDb, query} = require('./db');
getDb().then(() => {
  const d = query("SELECT id, nom_entite, etapes_json FROM dossiers WHERE nom_entite LIKE '%Ombilic%'");
  if (!d.length) { console.log('Dossier non trouve'); return; }
  const dos = d[0];
  const etapes = JSON.parse(dos.etapes_json || '{}');
  const pdc = etapes.prise_de_connaissance || {};
  const reponses = pdc.pdcReponses || {};
  console.log('Dossier:', dos.nom_entite);
  console.log('Statut PDC:', pdc.statut);
  console.log('Nombre de reponses:', Object.keys(reponses).length);
  console.log('Reponses:', JSON.stringify(reponses, null, 2));
}).catch(e => console.error(e.message));
