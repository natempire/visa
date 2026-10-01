import { FileText, FileSpreadsheet, File, Image } from 'lucide-react';

// Shared between DocumentsManager.js and DocumentsEntite.js — previously duplicated
// verbatim in both, which had already drifted once (a 0-byte guard existed in only one
// copy of formatTaille).
export const ICONES_TYPE = {
  pdf: { icone: FileText, couleur: '#ef4444', bg: '#fee2e2' },
  xlsx: { icone: FileSpreadsheet, couleur: '#10b981', bg: '#d1fae5' },
  xls: { icone: FileSpreadsheet, couleur: '#10b981', bg: '#d1fae5' },
  docx: { icone: FileText, couleur: '#2563a8', bg: '#dbeafe' },
  doc: { icone: FileText, couleur: '#2563a8', bg: '#dbeafe' },
  png: { icone: Image, couleur: '#8b5cf6', bg: '#ede9fe' },
  jpg: { icone: Image, couleur: '#8b5cf6', bg: '#ede9fe' },
  jpeg: { icone: Image, couleur: '#8b5cf6', bg: '#ede9fe' },
  csv: { icone: FileSpreadsheet, couleur: '#f59e0b', bg: '#fef3c7' },
};

export function getIcone(type) {
  return ICONES_TYPE[type] || { icone: File, couleur: '#64748b', bg: '#f1f5f9' };
}

export function formatTaille(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}
