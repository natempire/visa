import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { SECTIONS_PDC } from './pdcData';

// Helper: get display value from a question response
function getValeurAffichage(valeur) {
  if (!valeur) return '';
  if (typeof valeur === 'string') return valeur;
  if (typeof valeur === 'object') {
    let res = valeur.reponse || '';
    if (valeur.detail) res += '\n' + valeur.detail;
    return res;
  }
  return String(valeur);
}

function getCommentaire(valeur) {
  if (!valeur || typeof valeur !== 'object') return '';
  return valeur.commentaire || '';
}

export async function exportPDCExcel(dossier, pdcData) {
  const wb = XLSX.utils.book_new();

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '1A3A5C' } },
    alignment: { wrapText: true, vertical: 'center' },
    border: { bottom: { style: 'thin', color: { rgb: 'CCCCCC' } } }
  };

  const sectionStyle = {
    font: { bold: true, sz: 11, color: { rgb: '1A3A5C' } },
    fill: { fgColor: { rgb: 'E8F0FA' } },
    alignment: { wrapText: true, vertical: 'center' }
  };

  const questionStyle = {
    font: { sz: 10 },
    alignment: { wrapText: true, vertical: 'top' },
    border: { bottom: { style: 'hair', color: { rgb: 'E2E8F0' } } }
  };

  const obligatoireStyle = {
    ...questionStyle,
    font: { sz: 10, bold: true }
  };

  // Sheet for each section + global sheet
  // Build global sheet first (as in original)
  const sheetData = [];

  // Header rows
  sheetData.push(['QUESTIONNAIRE DE PRISE DE CONNAISSANCE GÉNÉRALE', '', '', '', '']);
  sheetData.push(['', 'Mission :', dossier.nomEntite || '', '', '']);
  sheetData.push(['', 'Intervenant :', dossier.nomExpert || 'Bamba Souleymane', '', '']);
  sheetData.push(['', 'Client :', dossier.nomEntite || '', '', '']);
  sheetData.push(['', 'Exercice :', dossier.exercice || '2025', '', '']);
  sheetData.push(['', 'Date :', new Date().toLocaleDateString('fr-FR'), '', '']);
  sheetData.push(['', '', '', '', '']);

  SECTIONS_PDC.forEach(section => {
    // Section header
    sheetData.push(['', section.label, '', '', '']);
    sheetData.push(['', 'Question FIDEA', 'Réponse du client', 'Justificatif', 'Commentaire EC']);

    section.questions.forEach(q => {
      const val = pdcData[q.id];
      const reponse = getValeurAffichage(val);
      const commentaire = getCommentaire(val);
      sheetData.push([
        '',
        (q.obligatoire ? '* ' : '') + q.label,
        reponse,
        q.justificatif,
        commentaire
      ]);
    });

    sheetData.push(['', '', '', '', '']); // spacer
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws['!cols'] = [
    { wch: 3 },
    { wch: 55 },
    { wch: 45 },
    { wch: 30 },
    { wch: 30 }
  ];

  // Row heights for wrapped content
  ws['!rows'] = sheetData.map(() => ({ hpt: 30 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Informations générales');

  // Individual sheets per section (matching original structure)
  SECTIONS_PDC.forEach((section, idx) => {
    const sData = [];
    sData.push(['', section.label, '', '', '']);
    sData.push(['', 'Question de FIDEA', 'Réponse du client', 'Justificatif', 'Commentaire EC']);

    section.questions.forEach(q => {
      const val = pdcData[q.id];
      sData.push([
        '',
        (q.obligatoire ? '* ' : '') + q.label,
        getValeurAffichage(val),
        q.justificatif,
        getCommentaire(val)
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(sData);
    ws2['!cols'] = [{ wch: 3 }, { wch: 55 }, { wch: 45 }, { wch: 30 }, { wch: 30 }];
    // Short sheet name
    const shortName = section.label.substring(0, 28) + (section.label.length > 28 ? '…' : '');
    XLSX.utils.book_append_sheet(wb, ws2, `${idx + 1}. ${shortName}`.substring(0, 31));
  });

  // Aide mémoire sheet
  const aideData = [['', "Aide mémoire de l'auditeur", '', '']];
  SECTIONS_PDC.forEach((section, idx) => {
    aideData.push(['', `${idx + 1}. ${section.label}`, '', '']);
    aideData.push(['', "Question de l'auditeur", 'Justificatif / Élément de référence', '']);
    section.questions.forEach(q => {
      aideData.push(['', q.label, q.justificatif, '']);
    });
    aideData.push(['', '', '', '']);
  });
  const wsAide = XLSX.utils.aoa_to_sheet(aideData);
  wsAide['!cols'] = [{ wch: 3 }, { wch: 60 }, { wch: 40 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsAide, "Aide Mémoire de l'auditeur");

  // Write and save
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const nomFichier = `PDC_${dossier.nomEntite}_${dossier.exercice}.xlsx`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  saveAs(blob, nomFichier);

  return { succes: true };
}
