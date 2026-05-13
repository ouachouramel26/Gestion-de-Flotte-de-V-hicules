import React, { useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { Car, Plus, Search, Edit3, Trash2, Gauge, AlertCircle, UserPlus, ShieldCheck, Filter, Info, User } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast';

// URLs RÉELLES du backend (via proxy en dev, relatif en prod)
const GRAPHQL_URL = '/graphql';

export default function VehiculesPage() {
  const { keycloak } = useKeycloak();
  const [vehicules, setVehicules] = useState([]);
  const [conducteurs, setConducteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedVehicule, setSelectedVehicule] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [errorVisible, setErrorVisible] = useState('');
  const [statutForm, setStatutForm] = useState('');

  // Formulaire aligné sur CreateVehiculeDTO / UpdateVehiculeDTO
  const [form, setForm] = useState({ plaque: '', marque: '', modele: '', annee: '', kilometrage: 0 });
  const [assignForm, setAssignForm] = useState({ conducteurId: '' });

  const isAdmin = keycloak.hasRealmRole('admin');
  const headers = () => ({ 'Authorization': `Bearer ${keycloak.token}`, 'Content-Type': 'application/json' });

  const fetchData = async () => {
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: `
            query($statut: StatutVehicule) {
              vehicules(statut: $statut) {
                id plaque marque modele annee kilometrage statut conducteurAssigneId dateAjout
                conducteurAssigne {
                  nom prenom
                }
              }
              conducteurs {
                id nom prenom email statutCompte disponibilite vehiculeAssigneId
              }
            }
          `,
          variables: { statut: filterStatut || null }
        })
      });

      if (!res.ok) {
        throw new Error(`Erreur de chargement (${res.status})`);
      }

      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);

      if (json.data) {
        if (json.data.vehicules) setVehicules(json.data.vehicules);
        if (json.data.conducteurs) setConducteurs(json.data.conducteurs);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(err.message);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [keycloak.token, filterStatut]);

  // POST /vehicules — body = CreateVehiculeDTO {plaque, marque, modele, annee, kilometrage}
  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorVisible('');
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation($plaque: String!, $marque: String!, $modele: String!, $annee: Int!, $kilometrage: Int) {
              creerVehicule(plaque: $plaque, marque: $marque, modele: $modele, annee: $annee, kilometrage: $kilometrage) {
                id
              }
            }
          `,
          variables: {
            plaque: form.plaque,
            marque: form.marque,
            modele: form.modele,
            annee: parseInt(form.annee),
            kilometrage: parseInt(form.kilometrage) || 0
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.errors?.[0]?.message || `Erreur serveur (${res.status})`);
      }

      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowModal(false);
      fetchData();
      toast.success('Véhicule créé avec succès !');
    } catch (err) {
      setErrorVisible(err.message);
      toast.error(err.message);
    }
  };

  // PUT /vehicules/:id — body = UpdateVehiculeDTO {marque, modele, annee, kilometrage}
  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorVisible('');
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation($id: ID!, $marque: String, $modele: String, $annee: Int, $kilometrage: Int) {
              modifierVehicule(id: $id, marque: $marque, modele: $modele, annee: $annee, kilometrage: $kilometrage) {
                id
              }
            }
          `,
          variables: {
            id: editItem.id,
            marque: form.marque,
            modele: form.modele,
            annee: parseInt(form.annee),
            kilometrage: parseInt(form.kilometrage) || 0
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.errors?.[0]?.message || `Erreur serveur (${res.status})`);
      }

      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowModal(false);
      setEditItem(null);
      fetchData();
      toast.success('Véhicule modifié !');
    } catch (err) {
      setErrorVisible(err.message);
      toast.error(err.message);
    }
  };

  // PATCH /vehicules/:id/assigner — body = AssignerVehiculeDTO {conducteurId}
  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: `
            mutation($vehiculeId: ID!, $conducteurId: ID!) {
              assignerConducteur(vehiculeId: $vehiculeId, conducteurId: $conducteurId) {
                id
              }
            }
          `,
          variables: {
            vehiculeId: selectedVehicule.id,
            conducteurId: assignForm.conducteurId
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.errors?.[0]?.message || `Erreur serveur (${res.status})`);
      }

      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowAssignModal(false);
      fetchData();
      toast.success('Conducteur assigné !');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // PATCH /vehicules/:id/statut — body = ChangerStatutDTO {statut}
  const handleChangeStatut = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation($id: ID!, $statut: StatutVehicule!) {
              changerStatutVehicule(id: $id, statut: $statut) {
                id
              }
            }
          `,
          variables: {
            id: selectedVehicule.id,
            statut: statutForm
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.errors?.[0]?.message || `Erreur serveur (${res.status})`);
      }

      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setShowStatutModal(false);
      fetchData();
      toast.success('Statut mis à jour !');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // DELETE /vehicules/:id — archivage (passage HORS_SERVICE côté backend)
  const handleArchive = async (v) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          Archiver le véhicule <strong>{v.plaque}</strong> ?
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetch(GRAPHQL_URL, {
                  method: 'POST',
                  headers: headers(),
                  body: JSON.stringify({
                    query: `
                      mutation($id: ID!) {
                        archiverVehicule(id: $id) { id }
                      }
                    `,
                    variables: { id: v.id }
                  })
                });

                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({}));
                  throw new Error(errorData.errors?.[0]?.message || `Erreur serveur (${res.status})`);
                }

                const json = await res.json();
                if (json.errors) throw new Error(json.errors[0].message);
                fetchData();
                toast.success('Véhicule archivé avec succès', { icon: '🗑️' });
              } catch (err) {
                toast.error(err.message);
              }
            }}
            className="btn btn-danger btn-sm"
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}
          >
            Confirmer
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}
          >
            Annuler
          </button>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'top-center',
      style: { border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', background: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }
    });
  };

  const getDriverName = (v) => {
    if (v.conducteurAssigne) return `${v.conducteurAssigne.nom} ${v.conducteurAssigne.prenom}`;
    if (!v.conducteurAssigneId) return 'Non assigné';
    // Fallback si la Gateway n'a pas encore résolu le conducteur
    const c = conducteurs.find(x => x.id === v.conducteurAssigneId);
    return c ? `${c.nom} ${c.prenom}` : 'Non assigné';
  };

  // Transitions valides (miroir du backend)
  const TRANSITIONS = {
    'DISPONIBLE': ['EN_MISSION', 'EN_MAINTENANCE', 'EN_PANNE'],
    'EN_MISSION': ['DISPONIBLE', 'EN_PANNE'],
    'EN_MAINTENANCE': ['DISPONIBLE'],
    'EN_PANNE': ['EN_MAINTENANCE', 'HORS_SERVICE'],
    'HORS_SERVICE': []
  };

  const filtered = vehicules.filter(v =>
    v.plaque?.toLowerCase().includes(search.toLowerCase()) ||
    v.marque?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Car size={28} color="#2563eb" /> Parc Automobile</h1>
          <p className="page-subtitle">{vehicules.length} véhicules enregistrés</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar"><Search size={16} /><input placeholder="Plaque, Marque..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Filter size={14} color="#64748b" />
            <select value={filterStatut} style={{ border: 'none', fontSize: '0.85rem', outline: 'none', background: 'transparent' }} onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="EN_MISSION">En mission</option>
              <option value="EN_MAINTENANCE">En maintenance</option>
              <option value="EN_PANNE">En panne</option>
              <option value="HORS_SERVICE">Hors service</option>
            </select>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setEditItem(null); setForm({ plaque: '', marque: '', modele: '', annee: '', kilometrage: 0 }); setErrorVisible(''); setShowModal(true); }}>
              <Plus size={16} /> Nouveau
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</p> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr><th>Plaque</th><th>Véhicule</th><th>Kilométrage</th><th>Conducteur</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Aucun véhicule trouvé.</td></tr>
                ) : filtered.map(v => (
                  <tr key={v.id} style={{ opacity: v.statut === 'HORS_SERVICE' ? 0.5 : 1 }}>
                    <td style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>{v.plaque}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.marque} {v.modele}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Année: {v.annee}</div>
                    </td>
                    <td><Gauge size={14} style={{ marginRight: 4 }} />{v.kilometrage?.toLocaleString()} km</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {v.conducteurAssigneId ? (
                          <>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                              {getDriverName(v).charAt(0)}
                            </div>
                            <span style={{ fontWeight: 500 }}>{getDriverName(v)}</span>
                          </>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Non assigné</span>
                        )}
                      </div>
                    </td>
                    <td><StatusBadge status={v.statut} /></td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedVehicule(v); setShowDetailModal(true); }} title="Détails"><Info size={14} /></button>
                        {v.statut !== 'HORS_SERVICE' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => { setSelectedVehicule(v); setStatutForm(''); setShowStatutModal(true); }} title="Changer statut"><ShieldCheck size={14} /></button>
                            <button className="btn btn-primary btn-sm" onClick={() => { setSelectedVehicule(v); setAssignForm({ conducteurId: v.conducteurAssigneId || '' }); setShowAssignModal(true); }} title="Assigner"><UserPlus size={14} /></button>
                            <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(v); setForm({ plaque: v.plaque, marque: v.marque, modele: v.modele, annee: v.annee, kilometrage: v.kilometrage }); setErrorVisible(''); setShowModal(true); }} title="Modifier"><Edit3 size={14} /></button>
                          </>
                        )}
                        {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleArchive(v)} title="Archiver"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALE CHANGEMENT STATUT */}
      <Modal
        isOpen={showStatutModal}
        onClose={() => setShowStatutModal(false)}
        title="Changer le Statut"
      >
        {selectedVehicule && (
          <>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              Véhicule : <strong>{selectedVehicule.plaque}</strong> — Statut actuel : <StatusBadge status={selectedVehicule.statut} />
            </p>
            <form onSubmit={handleChangeStatut}>
              <div className="form-group">
                <label>Nouveau statut</label>
                <select required value={statutForm} onChange={e => setStatutForm(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  {(TRANSITIONS[selectedVehicule.statut] || []).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {TRANSITIONS[selectedVehicule.statut]?.length === 0 && (
                  <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem' }}>Ce véhicule est HORS_SERVICE. Aucune transition n'est possible.</p>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowStatutModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={!statutForm}>Confirmer</button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* MODALE ASSIGNATION */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assigner Conducteur"
      >
        {selectedVehicule && (
          <>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Véhicule : <strong>{selectedVehicule.plaque}</strong></p>
            <form onSubmit={handleAssign}>
              <div className="form-group">
                <label>Conducteur (ACTIF & DISPONIBLE)</label>
                <select required value={assignForm.conducteurId} onChange={e => setAssignForm({ conducteurId: e.target.value })}>
                  <option value="">-- Choisir --</option>
                  {conducteurs.filter(c => c.statutCompte === 'ACTIF').map(c => {
                    const isEnMission = c.disponibilite !== 'DISPONIBLE';
                    return (
                      <option key={c.id} value={c.id} disabled={isEnMission}>
                        {c.nom} {c.prenom} {isEnMission ? '(En mission)' : (c.vehiculeAssigneId ? '(Changement de véhicule)' : '')}
                      </option>
                    );
                  })}
                </select>
                {selectedVehicule.statut !== 'DISPONIBLE' && (
                  <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>
                    ⚠️ Ce véhicule est en statut "{selectedVehicule.statut}". Il doit être repassé en "DISPONIBLE" pour être assigné à un nouveau conducteur.
                  </p>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowAssignModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider</button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* MODALE DÉTAILS */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Fiche Véhicule"
      >
        {selectedVehicule && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>PLAQUE</label><div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb' }}>{selectedVehicule.plaque}</div></div>
              <div><label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>STATUT</label><div><StatusBadge status={selectedVehicule.statut} /></div></div>
              <div><label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>MARQUE</label><div style={{ fontWeight: 700 }}>{selectedVehicule.marque}</div></div>
              <div><label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>MODÈLE</label><div>{selectedVehicule.modele}</div></div>
              <div><label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>ANNÉE</label><div>{selectedVehicule.annee}</div></div>
              <div><label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>KILOMÉTRAGE</label><div style={{ fontWeight: 700 }}>{selectedVehicule.kilometrage?.toLocaleString()} km</div></div>
              <div><label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>CONDUCTEUR</label><div>{getDriverName(selectedVehicule)}</div></div>
              <div><label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>AJOUTÉ LE</label><div style={{ fontSize: '0.85rem' }}>{selectedVehicule.dateAjout ? new Date(selectedVehicule.dateAjout).toLocaleDateString() : '—'}</div></div>
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowDetailModal(false)}>Fermer</button>
            </div>
          </>
        )}
      </Modal>

      {/* MODALE CRÉATION / MODIFICATION */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Modifier Véhicule' : 'Nouveau Véhicule'}
      >
        <>
          {errorVisible && <div className="alert alert-danger"><AlertCircle size={16} /> {errorVisible}</div>}
          <form onSubmit={editItem ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label>Plaque d'immatriculation</label>
              <input required value={form.plaque} disabled={!!editItem} onChange={e => setForm({ ...form, plaque: e.target.value.toUpperCase() })} placeholder="AB-123-CD" />
              {editItem && <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>La plaque ne peut pas être modifiée.</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>Marque</label><input required value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })} placeholder="Renault" /></div>
              <div className="form-group"><label>Modèle</label><input required value={form.modele} onChange={e => setForm({ ...form, modele: e.target.value })} placeholder="Master" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label>Année</label><input type="number" required min="1900" max="2100" value={form.annee} onChange={e => setForm({ ...form, annee: e.target.value })} /></div>
              <div className="form-group"><label>Kilométrage</label><input type="number" min="0" value={form.kilometrage} onChange={e => setForm({ ...form, kilometrage: e.target.value })} /></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Sauvegarder</button>
            </div>
          </form>
        </>
      </Modal>
    </div>
  );
}
