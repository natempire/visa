const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const mammoth = require('mammoth');

const MIME_PAR_EXT = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function excelVersCsv(buffer) {
  const classeur = XLSX.read(buffer, { type: 'buffer' });
  return classeur.SheetNames.map(nom => {
    const feuille = classeur.Sheets[nom];
    const csv = XLSX.utils.sheet_to_csv(feuille);
    return `--- Feuille : ${nom} ---\n${csv}`;
  }).join('\n\n');
}

async function docxVersTexte(buffer) {
  const resultat = await mammoth.extractRawText({ buffer });
  return resultat.value;
}

// Construit les blocs de contenu Anthropic (texte/document/image) pour un ensemble de
// fichiers, en sautant silencieusement ceux qu'on ne sait pas lire (ex: .doc binaire).
async function construireBlocsDocuments(fichiers) {
  const blocs = [];
  const ignores = [];

  for (const fichier of fichiers) {
    const ext = path.extname(fichier.nom).toLowerCase();
    try {
      const buffer = fs.readFileSync(fichier.chemin);

      if (MIME_PAR_EXT[ext]) {
        blocs.push({ type: 'text', text: `Fichier joint : ${fichier.nom}` });
        const type = ext === '.pdf' ? 'document' : 'image';
        blocs.push({
          type,
          source: { type: 'base64', media_type: MIME_PAR_EXT[ext], data: buffer.toString('base64') },
        });
      } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        blocs.push({ type: 'text', text: `Fichier joint (tableau) : ${fichier.nom}\n${excelVersCsv(buffer)}` });
      } else if (ext === '.docx') {
        const texte = await docxVersTexte(buffer);
        blocs.push({ type: 'text', text: `Fichier joint : ${fichier.nom}\n${texte}` });
      } else {
        ignores.push(fichier.nom);
      }
    } catch (err) {
      ignores.push(fichier.nom);
    }
  }

  return { blocs, ignores };
}

module.exports = { construireBlocsDocuments, excelVersCsv };
