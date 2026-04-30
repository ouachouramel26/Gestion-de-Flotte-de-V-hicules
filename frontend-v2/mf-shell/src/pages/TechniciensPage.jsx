import React, { useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import {
  Wrench, Plus, Search, Edit3, Trash2, X, Mail, Phone,
  UserCheck, UserX, AlertCircle, Calendar, Activity, Info
} from 'lucide-react';

const API_BASE = 'http://localhost:8083/api/v1/techniciens';

const DISPO_META = {
  DISPONIBLE: { badge: 'badge-success', label: 'Disponible',  color: '#059669' },
  EN_INTERVENTION: { badge: 'badge-info',    label: 'En intervention',  color: '#2563eb' },
  INDISPONIBLE: { badge: 'badge-danger',  label: 'Indisponible', color: '#dc2626' }
};

export default function TechniciensPage() {
  const { keycloak } = useKeycloak();
  const [techniciens, setTechniciens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorVisible, setErrorVisible] = useState('');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    disponibilite: 'DISPONIBLE'
  });

  const isAdmin = keycloak.hasRealmRole('admin');
  const headers = () => ({
    'Authorization': `Bearer ${keycloak.token}`,
    'Content-Type': 'application/json'
  });

  const fetchData = async () => {
    try {
      const res = await fetch(API_BASE, { headers: { 'Authorization': `Bearer ${keycloak.token}` } });
      if (res.ok) setTechniciens(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [keycloak.token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorVisible('');
    
    const method = editItem ? 'PUT' : 'POST';
    const url = editItem ? `${API_BASE}/${editItem.id}` : API_BASE;
    
    try {
      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Erreur lors de la sauvegarde');
      }
      setShowModal(false);
      setEditItem(null);
      resetForm();
      fetchData();
    } catch (err) { setErrorVisible(err.message); }
  };

  const handleDelete = async (id) => {
    if (!isAdmin || !window.confirm('Supprimer ce technicien ?')) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: headers() });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => setForm({ nom: '', prenom: '', email: '', telephone: '', disponibilite: 'DISPONIBLE' });

  const filtered = techniciens.filter(t => 
    t.nom?.toLowerCase().includes(search.toLowerCase()) ||
    t.prenom?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={28} color="#d97706" /> Gestion des Techniciens
          </h1>
          <p className="page-subtitle">{techniciens.length} technicien(s) enregistré(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {isAdmin && (
            <button className="btn btn-primary" style={{ background: '#d97706', borderColor: '#d97706' }} 
              onClick={() => { setEditItem(null); resetForm(); setShowModal(true); }}>
              <Plus size={16} /> Ajouter
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</p> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom & Prénom</th>
                  <th>Contact</th>
                  <th>Disponibilité</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Aucun technicien trouvé.</td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id}>
                    <td><div style={{ fontWeight: 700 }}>{t.prenom} {t.nom}</div></td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}><Mail size={12} /> {t.email}</div>
                      {t.telephone && <div style={{ fontSize: '0.85rem' }}><Phone size={12} /> {t.telephone}</div>}
                    </td>
                    <td>
                      <span className={`badge ${DISPO_META[t.disponibilite]?.badge || 'badge-gray'}`}>
                        {DISPO_META[t.disponibilite]?.label || t.disponibilite}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          setEditItem(t);
                          setForm({ nom: t.nom, prenom: t.prenom, email: t.email, telephone: t.telephone || '', disponibilite: t.disponibilite });
                          setShowModal(true);
                        }}>
                          <Edit3 size={13} />
                        </button>
                        {isAdmin && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>{editItem ? 'Modifier' : 'Ajouter'} un technicien</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none' }}><X size={20} /></button>
            </div>
            {errorVisible && <div style={{ color: 'red', marginBottom: '1rem' }}>{errorVisible}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label>Nom</label><input required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} /></div>
                <div className="form-group"><label>Prénom</label><input required value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Email</label><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label>Téléphone</label><input value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} /></div>
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#d97706' }}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
