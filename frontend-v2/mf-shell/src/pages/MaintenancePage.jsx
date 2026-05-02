import React, { useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import {
  Wrench, Plus, Edit3, X, Calendar, DollarSign, ClipboardList,
  User, CheckCircle, AlertCircle, Clock, Car, Filter, Search,
  PlayCircle, XCircle, CheckSquare, CalendarClock, History, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const GRAPHQL_URL = 'http://localhost:4000/graphql';

const ModalWrapper = ({ show, onClose, title, icon: Icon, children, error }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {Icon && <Icon size={20} />} {title}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {error && (
          <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', color: '#dc2626', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default function MaintenancePage({ userRole }) {
  const { keycloak } = useKeycloak();
  const [maintenances, setMaintenances]   = useState([]);
  const [vehicules, setVehicules]         = useState([]);
  const [techniciens, setTechniciens]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filterStatut, setFilterStatut]   = useState('');
  const [search, setSearch]               = useState('');
  const [error, setError]                 = useState('');

  // Modales
  const [showCreate, setShowCreate]           = useState(false);
  const [showPlanifier, setShowPlanifier]     = useState(false);
  const [showDemarrer, setShowDemarrer]       = useState(false);
  const [showCloturer, setShowCloturer]       = useState(false);
  const [showAnnuler, setShowAnnuler]         = useState(false);
  const [showHistorique, setShowHistorique]   = useState(false);
  const [selectedItem, setSelectedItem]       = useState(null);

  const [createForm, setCreateForm] = useState({
    vehiculeId: '', typeIntervention: 'REVISION', description: ''
  });
  const [planifierForm, setPlanifierForm] = useState({ datePlanifiee: '', technicienId: '' });
  const [cloturerForm, setCloturerForm]   = useState({ compteRendu: '', cout: 0 });
  const [annulerForm, setAnnulerForm]     = useState({ motif: '' });
  const [historiqueVehiculeId, setHistoriqueVehiculeId] = useState('');
  const [historique, setHistorique]       = useState([]);

  const isAdmin      = keycloak.hasRealmRole('admin');
  const isTechnicien = keycloak.hasRealmRole('technicien');
  const canCreate    = isAdmin || isTechnicien;

  const headers = () => ({
    'Authorization': `Bearer ${keycloak.token}`,
    'Content-Type': 'application/json'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = `
        query($statut: StatutMaintenance) {
          maintenances(statut: $statut) {
            id vehiculeId technicienId typeIntervention description statut dateCreation datePlanifiee cout compteRendu
          }
          vehicules { id plaque marque modele }
          techniciens { id nom prenom disponibilite }
        }
      `;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query,
          variables: { statut: filterStatut || null }
        })
      });
      const json = await res.json();
      if (json.data) {
        if (json.data.maintenances) setMaintenances(json.data.maintenances);
        if (json.data.vehicules) setVehicules(json.data.vehicules);
        if (json.data.techniciens) setTechniciens(json.data.techniciens);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterStatut, keycloak.token]);

  const getVehiclePlate = (id) => vehicules.find(v => v.id === id)?.plaque || id?.substring(0, 8) || '—';
  const getTechName     = (id) => {
    const t = techniciens.find(x => x.id === id);
    return t ? `${t.prenom} ${t.nom}` : '—';
  };

  const statusMeta = {
    SIGNALEE:     { badge: 'badge-danger',  label: 'Signalée',    color: '#dc2626' },
    PLANIFIEE:    { badge: 'badge-info',    label: 'Planifiée',   color: '#2563eb' },
    EN_COURS:     { badge: 'badge-warning', label: 'En cours',    color: '#d97706' },
    TERMINEE:     { badge: 'badge-success', label: 'Terminée',    color: '#059669' },
    ANNULEE:      { badge: 'badge-gray',    label: 'Annulée',     color: '#64748b' }
  };

  // ---- CRÉER une intervention ----
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const query = `
        mutation($vId: ID!, $type: String!, $desc: String) {
          signalerMaintenance(vehiculeId: $vId, typeIntervention: $type, description: $desc) { id }
        }
      `;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query,
          variables: {
            vId: createForm.vehiculeId,
            type: createForm.typeIntervention,
            desc: createForm.description
          }
        })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowCreate(false);
      setCreateForm({ vehiculeId: '', typeIntervention: 'REVISION', description: '' });
      fetchData();
      toast.success('Maintenance signalée !');
    } catch (err) { 
      setError(err.message); 
      toast.error(err.message);
    }
  };

  // ---- PLANIFIER (PATCH /planifier) ----
  const handlePlanifier = async (e) => {
    e.preventDefault();
    setError('');
    if (!planifierForm.technicienId) { setError('Un technicien est requis.'); return; }
    try {
      const query = `
        mutation($id: ID!, $date: String!, $tId: ID!) {
          planifierMaintenance(id: $id, datePlanifiee: $date, technicienId: $tId) { id }
        }
      `;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query,
          variables: {
            id: selectedItem.id,
            date: `${planifierForm.datePlanifiee}T00:00:00`,
            tId: planifierForm.technicienId
          }
        })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowPlanifier(false);
      fetchData();
      toast.success('Maintenance planifiée !');
    } catch (err) { 
      setError(err.message); 
      toast.error(err.message);
    }
  };

  // ---- DÉMARRER (PATCH /demarrer) ----
  const handleDemarrer = async () => {
    setError('');
    try {
      const query = `mutation($id: ID!) { demarrerMaintenance(id: $id) { id } }`;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ query, variables: { id: selectedItem.id } })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowDemarrer(false);
      fetchData();
      toast.success('Travaux démarrés !');
    } catch (err) { 
      setError(err.message); 
      toast.error(err.message);
    }
  };

  // ---- CLÔTURER (PATCH /cloturer) ----
  const handleCloturer = async (e) => {
    e.preventDefault();
    setError('');
    if (!cloturerForm.compteRendu?.trim()) { setError('Le compte-rendu est obligatoire.'); return; }
    if (cloturerForm.cout < 0) { setError('Le coût doit être >= 0.'); return; }
    try {
      const query = `
        mutation($id: ID!, $cr: String, $cout: Float) {
          cloturerMaintenance(id: $id, compteRendu: $cr, cout: $cout) { id }
        }
      `;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query,
          variables: {
            id: selectedItem.id,
            cr: cloturerForm.compteRendu,
            cout: parseFloat(cloturerForm.cout)
          }
        })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowCloturer(false);
      setCloturerForm({ compteRendu: '', cout: 0 });
      fetchData();
      toast.success('Maintenance clôturée !');
    } catch (err) { 
      setError(err.message); 
      toast.error(err.message);
    }
  };

  // ---- ANNULER (PATCH /annuler) ----
  const handleAnnuler = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const query = `mutation($id: ID!, $motif: String) { annulerMaintenance(id: $id, motif: $motif) { id } }`;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query,
          variables: { id: selectedItem.id, motif: annulerForm.motif }
        })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowAnnuler(false);
      setAnnulerForm({ motif: '' });
      fetchData();
      toast.success('Maintenance annulée');
    } catch (err) { 
      setError(err.message); 
      toast.error(err.message);
    }
  };

  // ---- HISTORIQUE véhicule ----
  const fetchHistorique = async () => {
    if (!historiqueVehiculeId) return;
    setError('');
    try {
      const query = `query($vId: ID!) { historiqueMaintenance(vehiculeId: $vId) { id typeIntervention description statut dateCreation cout compteRendu } }`;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ query, variables: { vId: historiqueVehiculeId } })
      });
      const json = await res.json();
      if (json.data) setHistorique(json.data.historiqueMaintenance || []);
      else setHistorique([]);
    } catch (err) { setHistorique([]); }
  };

  const openAction = (item, action) => {
    setSelectedItem(item);
    setError('');
    if (action === 'planifier') {
      setPlanifierForm({ datePlanifiee: '', technicienId: item.technicienId || '' });
      setShowPlanifier(true);
    } else if (action === 'demarrer') {
      setShowDemarrer(true);
    } else if (action === 'cloturer') {
      setCloturerForm({ compteRendu: item.compteRendu || '', cout: item.cout || 0 });
      setShowCloturer(true);
    } else if (action === 'annuler') {
      setAnnulerForm({ motif: '' });
      setShowAnnuler(true);
    }
  };

  const filtered = maintenances.filter(m =>
    getVehiclePlate(m.vehiculeId).toLowerCase().includes(search.toLowerCase()) ||
    m.typeIntervention?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toISOString().split('T')[0];


  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={26} color="#d97706" /> Maintenance
          </h1>
          <p className="page-subtitle">{maintenances.length} dossier(s) enregistré(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Véhicule, type..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Filter size={14} color="#64748b" />
            <select value={filterStatut} style={{ border: 'none', fontSize: '0.85rem', outline: 'none', background: 'transparent' }}
              onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="SIGNALEE">Signalée</option>
              <option value="PLANIFIEE">Planifiée</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINEE">Terminée</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </div>
          <button className="btn btn-secondary" style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }}
            onClick={() => { setHistorique([]); setHistoriqueVehiculeId(''); setShowHistorique(true); }}>
            <History size={16} /> Historique
          </button>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => { setCreateForm({ vehiculeId: '', typeIntervention: 'REVISION', description: '' }); setError(''); setShowCreate(true); }}>
              <Plus size={16} /> Signaler
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Chargement...</p> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Technicien</th>
                  <th>Date planifiée</th>
                  <th>Coût</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Aucun dossier trouvé.</td></tr>
                ) : filtered.map(m => {
                  const meta = statusMeta[m.statut] || statusMeta.SIGNALEE;
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700 }}>{getVehiclePlate(m.vehiculeId)}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                          {m.typeIntervention}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.description || '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{getTechName(m.technicienId)}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {m.datePlanifiee ? new Date(m.datePlanifiee).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.cout > 0 ? `${m.cout} €` : '—'}</td>
                      <td><span className={`badge ${meta.badge}`}>{meta.label}</span></td>
                      <td>
                        <div className="actions-cell">
                          {/* Boutons contextuels selon statut */}
                          {m.statut === 'SIGNALEE' && canCreate && (
                            <button className="btn btn-primary btn-sm" onClick={() => openAction(m, 'planifier')} title="Planifier">
                              <CalendarClock size={14} /> Planifier
                            </button>
                          )}
                          {m.statut === 'PLANIFIEE' && (isTechnicien || isAdmin) && (
                            <button className="btn btn-sm" style={{ background: '#d97706', color: 'white' }} onClick={() => openAction(m, 'demarrer')} title="Démarrer">
                              <PlayCircle size={14} /> Démarrer
                            </button>
                          )}
                          {m.statut === 'EN_COURS' && (isTechnicien || isAdmin) && (
                            <>
                              <button className="btn btn-sm" style={{ background: '#059669', color: 'white' }} onClick={() => openAction(m, 'cloturer')} title="Clôturer">
                                <CheckSquare size={14} /> Clôturer
                              </button>
                              <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white' }} onClick={() => openAction(m, 'annuler')} title="Annuler">
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          {m.statut === 'PLANIFIEE' && isAdmin && (
                            <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white' }} onClick={() => openAction(m, 'annuler')} title="Annuler">
                              <XCircle size={14} />
                            </button>
                          )}
                          {m.statut === 'TERMINEE' && isAdmin && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Clôturé</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- MODALE CRÉER ---- */}
      <ModalWrapper show={showCreate} onClose={() => setShowCreate(false)} title="Signaler une intervention" icon={Wrench} error={error}>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Véhicule *</label>
            <select required value={createForm.vehiculeId} onChange={e => setCreateForm({ ...createForm, vehiculeId: e.target.value })}>
              <option value="">Sélectionner un véhicule...</option>
              {vehicules.filter(v => v.statut !== 'HORS_SERVICE').map(v => (
                <option key={v.id} value={v.id}>{v.plaque} — {v.marque} {v.modele}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Type d'intervention *</label>
            <select value={createForm.typeIntervention} onChange={e => setCreateForm({ ...createForm, typeIntervention: e.target.value })}>
              <option value="REVISION">Révision</option>
              <option value="REPARATION">Réparation</option>
              <option value="CONTROLE_TECHNIQUE">Contrôle technique</option>
              <option value="VIDANGE">Vidange</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Décrivez le problème ou l'intervention..."
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter', fontSize: '0.9rem', resize: 'vertical' }} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={() => setShowCreate(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary">Signaler</button>
          </div>
        </form>
      </ModalWrapper>

      {/* ---- MODALE PLANIFIER ---- */}
      <ModalWrapper show={showPlanifier} onClose={() => setShowPlanifier(false)} title="Planifier l'intervention" icon={CalendarClock} error={error}>
        <form onSubmit={handlePlanifier}>
          {selectedItem && (
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              Véhicule : <strong>{getVehiclePlate(selectedItem.vehiculeId)}</strong> — Type : <strong>{selectedItem.typeIntervention}</strong>
            </div>
          )}
          <div className="form-group">
            <label>Date planifiée *</label>
            <input type="date" required min={today} value={planifierForm.datePlanifiee}
              onChange={e => setPlanifierForm({ ...planifierForm, datePlanifiee: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Technicien assigné *</label>
            <select required value={planifierForm.technicienId} onChange={e => setPlanifierForm({ ...planifierForm, technicienId: e.target.value })}>
              <option value="">Choisir un technicien...</option>
              {techniciens.filter(t => t.disponibilite !== 'INDISPONIBLE').map(t => (
                <option key={t.id} value={t.id}>{t.prenom} {t.nom} {t.disponibilite ? `(${t.disponibilite})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={() => setShowPlanifier(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary"><CalendarClock size={16} /> Planifier</button>
          </div>
        </form>
      </ModalWrapper>

      {/* ---- MODALE DÉMARRER ---- */}
      <ModalWrapper show={showDemarrer} onClose={() => setShowDemarrer(false)} title="Démarrer l'intervention" icon={PlayCircle} error={error}>
        {selectedItem && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <PlayCircle size={48} color="#d97706" style={{ marginBottom: '1rem', opacity: 0.8 }} />
            <p style={{ color: '#475569' }}>
              Confirmer le démarrage de l'intervention sur le véhicule<br />
              <strong>{getVehiclePlate(selectedItem.vehiculeId)}</strong> ?
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              Le véhicule passera automatiquement à <strong>EN_MAINTENANCE</strong>.
            </p>
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-cancel" onClick={() => setShowDemarrer(false)}>Annuler</button>
          <button className="btn" style={{ background: '#d97706', color: 'white' }} onClick={handleDemarrer}>
            <PlayCircle size={16} /> Démarrer
          </button>
        </div>
      </ModalWrapper>

      {/* ---- MODALE CLÔTURER ---- */}
      <ModalWrapper show={showCloturer} onClose={() => setShowCloturer(false)} title="Clôturer l'intervention" icon={CheckSquare} error={error}>
        <form onSubmit={handleCloturer}>
          {selectedItem && (
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              Véhicule : <strong>{getVehiclePlate(selectedItem.vehiculeId)}</strong>
            </div>
          )}
          <div className="form-group">
            <label>Compte-rendu d'intervention *</label>
            <textarea rows={4} required value={cloturerForm.compteRendu}
              onChange={e => setCloturerForm({ ...cloturerForm, compteRendu: e.target.value })}
              placeholder="Décrivez les travaux effectués..."
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter', fontSize: '0.9rem', resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label>Coût total (€)</label>
            <input type="number" min="0" step="0.01" value={cloturerForm.cout}
              onChange={e => setCloturerForm({ ...cloturerForm, cout: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={() => setShowCloturer(false)}>Annuler</button>
            <button type="submit" className="btn" style={{ background: '#059669', color: 'white' }}>
              <CheckSquare size={16} /> Clôturer
            </button>
          </div>
        </form>
      </ModalWrapper>

      {/* ---- MODALE ANNULER ---- */}
      <ModalWrapper show={showAnnuler} onClose={() => setShowAnnuler(false)} title="Annuler l'intervention" icon={XCircle} error={error}>
        <form onSubmit={handleAnnuler}>
          {selectedItem && (
            <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#dc2626' }}>
              Annuler l'intervention sur : <strong>{getVehiclePlate(selectedItem.vehiculeId)}</strong> ?<br />
              <span style={{ fontSize: '0.75rem' }}>Le véhicule repassera à DISPONIBLE.</span>
            </div>
          )}
          <div className="form-group">
            <label>Motif d'annulation</label>
            <textarea rows={3} value={annulerForm.motif}
              onChange={e => setAnnulerForm({ motif: e.target.value })}
              placeholder="Motif (optionnel)..."
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter', fontSize: '0.9rem', resize: 'vertical' }} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={() => setShowAnnuler(false)}>Garder</button>
            <button type="submit" className="btn btn-danger"><XCircle size={16} /> Confirmer l'annulation</button>
          </div>
        </form>
      </ModalWrapper>


      {/* ---- MODALE HISTORIQUE ---- */}
      {showHistorique && (
        <div className="modal-overlay" onClick={() => setShowHistorique(false)}>
          <div className="modal" style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={20} /> Historique véhicule</h2>
              <button onClick={() => setShowHistorique(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <select value={historiqueVehiculeId} onChange={e => setHistoriqueVehiculeId(e.target.value)} style={{ flex: 1, padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'Inter', fontSize: '0.9rem' }}>
                <option value="">Choisir un véhicule...</option>
                {vehicules.map(v => (<option key={v.id} value={v.id}>{v.plaque} — {v.marque}</option>))}
              </select>
              <button className="btn btn-primary" onClick={fetchHistorique} disabled={!historiqueVehiculeId}><ChevronRight size={16} /> Voir</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {historique.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Sélectionnez un véhicule pour voir son historique.</p>
              ) : historique.map(m => {
                const meta = statusMeta[m.statut] || statusMeta.SIGNALEE;
                return (
                  <div key={m.id} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color, marginTop: '5px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.typeIntervention}</span>
                        <span className={`badge ${meta.badge}`} style={{ fontSize: '0.7rem' }}>{meta.label}</span>
                      </div>
                      {m.description && <p style={{ margin: '0.25rem 0', fontSize: '0.82rem', color: '#64748b' }}>{m.description}</p>}
                      {m.compteRendu && <p style={{ margin: '0.25rem 0', fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>{m.compteRendu}</p>}
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem', display: 'flex', gap: '1rem' }}>
                        {m.datePlanifiee && <span><Calendar size={11} /> {new Date(m.datePlanifiee).toLocaleDateString('fr-FR')}</span>}
                        {m.cout > 0 && <span><DollarSign size={11} /> {m.cout} €</span>}
                        {m.technicienId && <span><User size={11} /> {getTechName(m.technicienId)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
