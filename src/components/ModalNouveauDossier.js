import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EXPERT_PAR_DEFAUT } from '../utils/constants';

export default function ModalNouveauDossier({ onClose, onCreer }) {
  const { utilisateurs } = useApp();
  const [form, setForm] = useState({
    nomEntite: '',
    nccEntite: '',
    adresseEntite: '',
    exercice: '2025',
    nomGerant: '',
    chiffreAffaires: '',
    nombreHeures: '',
    montantHonoraires: '',
    totalBilan: '',
    capitauxPropres: '',
    resultatNet: '',
    totalProduits: '',
    nomExpert: EXPERT_PAR_DEFAUT,
    nomAssistant: '',
    planning: '',
    listeDocuments: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreer(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>Nouveau dossier VISA</h3>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflow: 'auto', flex: 1 }}>
          <div className="modal-body">
            {/* Entité */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                Informations sur l'entité
              </div>
              <div className="grid-2" style={{ gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: '1/-1' }}>
                  <label className="form-label">Nom de l'entité *</label>
                  <input className="form-control" required value={form.nomEntite}
                    onChange={e => set('nomEntite', e.target.value)} placeholder="SARL EXEMPLE CI" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">N° Compte Contribuable *</label>
                  <input className="form-control" required value={form.nccEntite}
                    onChange={e => set('nccEntite', e.target.value)} placeholder="XX XXX XX X" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Exercice *</label>
                  <select className="form-control" value={form.exercice} onChange={e => set('exercice', e.target.value)}>
                    <option>2025</option><option>2024</option><option>2023</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: '1/-1' }}>
                  <label className="form-label">Adresse</label>
                  <input className="form-control" value={form.adresseEntite}
                    onChange={e => set('adresseEntite', e.target.value)} placeholder="Abidjan, Côte d'Ivoire" />
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: '1/-1' }}>
                  <label className="form-label">Nom du gérant</label>
                  <input className="form-control" value={form.nomGerant}
                    onChange={e => set('nomGerant', e.target.value)} placeholder="Monsieur / Madame …" />
                </div>
              </div>
            </div>

            {/* Chiffres clés */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                Chiffres clés (en FCFA)
              </div>
              <div className="grid-2" style={{ gap: 14 }}>
                {[
                  ['chiffreAffaires', "Chiffre d'affaires"],
                  ['totalBilan', 'Total Bilan'],
                  ['capitauxPropres', 'Capitaux propres'],
                  ['resultatNet', 'Résultat net'],
                  ['totalProduits', 'Total Produits'],
                  ['montantHonoraires', 'Honoraires HT'],
                ].map(([key, label]) => (
                  <div className="form-group" style={{ marginBottom: 0 }} key={key}>
                    <label className="form-label">{label}</label>
                    <input className="form-control" type="number" value={form[key]}
                      onChange={e => set(key, e.target.value)} placeholder="0" />
                  </div>
                ))}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Volume horaire</label>
                  <input className="form-control" type="number" value={form.nombreHeures}
                    onChange={e => set('nombreHeures', e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>

            {/* Équipe */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
                Équipe
              </div>
              <div className="grid-2" style={{ gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expert-Comptable</label>
                  <input className="form-control" value={form.nomExpert}
                    onChange={e => set('nomExpert', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assistant d'encadrement</label>
                  <input className="form-control" value={form.nomAssistant}
                    onChange={e => set('nomAssistant', e.target.value)} placeholder="Nom de l'assistant" />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary">Créer le dossier</button>
          </div>
        </form>
      </div>
    </div>
  );
}
