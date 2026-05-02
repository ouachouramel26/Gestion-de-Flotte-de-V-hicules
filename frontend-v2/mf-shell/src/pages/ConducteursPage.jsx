import React, { useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import {
  Users, Plus, Search, Edit3, Trash2, X, Mail, Phone,
  UserCheck, UserX, AlertCircle, Calendar, Car, Activity,
  ShieldOff, ShieldCheck, ToggleLeft, ToggleRight, Info
} from 'lucide-react';

const GRAPHQL_URL = 'http://localhost:4000/graphql';

const STATUT_COMPTE_META = {
  ACTIF:    { badge: 'badge-success', label: 'Actif',    color: '#059669' },
  INACTIF:  { badge: 'badge-gray',    label: 'Inactif',  color: '#64748b' },
  SUSPENDU: { badge: 'badge-danger',  label: 'Suspendu', color: '#dc2626' }
};
const DISPO_META = {
  DISPONIBLE: { badge: 'badge-success', label: 'Disponible',  color: '#059669' },
  EN_MISSION: { badge: 'badge-info',    label: 'En mission',  color: '#2563eb' }
};

export default function ConducteursPage({ userRole }) {
  const { keycloak } = useKeycloak();
  const [conducteurs, setConducteurs]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filterStatut, setFilterStatut]   = useState('');
  const [errorVisible, setErrorVisible]   = useState('');

  // Modales
  const [showModal, setShowModal]             = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [showDispoModal, setShowDispoModal]   = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editItem, setEditItem]               = useState(null);
  const [selectedC, setSelectedC]             = useState(null);

  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    numeroPermis: '',
    statutCompte: 'ACTIF', disponibilite: 'DISPONIBLE',
    dateExpirationPermis: ''
  });
  const [statutForm, setStatutForm] = useState('');
  const [dispoForm, setDispoForm]   = useState('');

  const isAdmin = keycloak.hasRealmRole('admin');
  const headers = () => ({
    'Authorization': `Bearer ${keycloak.token}`,
    'Content-Type': 'application/json'
  });

  const fetchData = async () => {
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: `
            query($statutCompte: StatutCompte, $disponibilite: DisponibiliteConducteur) {
              conducteurs(statutCompte: $statutCompte, disponibilite: $disponibilite) {
                id prenom nom email telephone numeroPermis dateExpirationPermis
                statutCompte disponibilite vehiculeAssigneId keycloakId dateCreation
              }
            }
          `,
          variables: {
            statutCompte: filterStatut || null,
            disponibilite: null
          }
        })
      });
      const json = await res.json();
      if (json.data && json.data.conducteurs) {
        setConducteurs(json.data.conducteurs);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [keycloak.token]);

  // POST ou PUT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorVisible('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) { setErrorVisible("Format email invalide."); return; }
    const expDate = new Date(form.dateExpirationPermis);
    if (!editItem && expDate <= new Date()) { setErrorVisible("Date d'expiration du permis doit être future."); return; }
    if (form.telephone && form.telephone.replace(/\D/g, '').length < 8) { setErrorVisible("Numéro de téléphone trop court."); return; }

    try {
      const query = editItem ? `
        mutation($id: ID!, $prenom: String, $nom: String, $email: String, $telephone: String, $numeroPermis: String, $dateExpirationPermis: String) {
          modifierConducteur(id: $id, prenom: $prenom, nom: $nom, email: $email, telephone: $telephone, numeroPermis: $numeroPermis, dateExpirationPermis: $dateExpirationPermis) {
            id
          }
        }
      ` : `
        mutation($prenom: String!, $nom: String!, $email: String!, $telephone: String, $numeroPermis: String!, $dateExpirationPermis: String!) {
          creerConducteur(prenom: $prenom, nom: $nom, email: $email, telephone: $telephone, numeroPermis: $numeroPermis, dateExpirationPermis: $dateExpirationPermis) {
            id
          }
        }
      `;

      const variables = editItem ? { id: editItem.id, ...form } : { ...form };
      
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ query, variables })
      });
      
      const json = await res.json();
      if (json.errors) {
        throw new Error(json.errors[0].message || 'Erreur lors de la sauvegarde');
      }
      
      setShowModal(false);
      setEditItem(null);
      resetForm();
      fetchData();
    } catch (err) {
      setErrorVisible(err.message);
    }
  };

  // PATCH /statut — changer statut compte
  const handleChangeStatut = async (e) => {
    e.preventDefault();
    setErrorVisible('');
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: `
            mutation($id: ID!, $statutCompte: StatutCompte!) {
              changerStatutConducteur(id: $id, statutCompte: $statutCompte) {
                id
              }
            }
          `,
          variables: { id: selectedC.id, statutCompte: statutForm }
        })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message || 'Transition impossible');
      setShowStatutModal(false);
      fetchData();
    } catch (err) { setErrorVisible(err.message); }
  };

  // PATCH /disponibilite — changer disponibilité
  const handleChangeDispo = async (e) => {
    e.preventDefault();
    setErrorVisible('');
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: `
            mutation($id: ID!, $disponibilite: DisponibiliteConducteur!) {
              changerDisponibiliteConducteur(id: $id, disponibilite: $disponibilite) {
                id
              }
            }
          `,
          variables: { id: selectedC.id, disponibilite: dispoForm }
        })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message || 'Erreur');
      setShowDispoModal(false);
      fetchData();
    } catch (err) { setErrorVisible(err.message); }
  };

  // DELETE — désactivation Admin
  const handleDesactiver = async (c) => {
    if (!isAdmin) return;
    if (c.disponibilite === 'EN_MISSION') { alert('Impossible : conducteur EN_MISSION.'); return; }
    if (!window.confirm(`Désactiver ${c.prenom} ${c.nom} ?`)) return;
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          query: `
            mutation($id: ID!) {
              desactiverConducteur(id: $id) {
                id
              }
            }
          `,
          variables: { id: c.id }
        })
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message || 'Erreur');
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const resetForm = () => setForm({
    nom: '', prenom: '', email: '', telephone: '',
    numeroPermis: '',
    statutCompte: 'ACTIF', disponibilite: 'DISPONIBLE', dateExpirationPermis: ''
  });

  const openEdit = (c) => {
    setEditItem(c);
    setErrorVisible('');
    setForm({
      nom: c.nom, prenom: c.prenom, email: c.email,
      telephone: c.telephone || '', numeroPermis: c.numeroPermis,
      statutCompte: c.statutCompte || 'ACTIF',
      disponibilite: c.disponibilite || 'DISPONIBLE',
      dateExpirationPermis: c.dateExpirationPermis?.substring(0, 10) || ''
    });
    setShowModal(true);
  };

  const isPermisExpirant = (date) => {
    if (!date) return false;
    const exp   = new Date(date);
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return exp < limit;
  };
  const isPermisExpire = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const filtered = conducteurs.filter(c => {
    const matchSearch = (
      c.nom?.toLowerCase().includes(search.toLowerCase()) ||
      c.prenom?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    );
    const matchStatut = filterStatut ? c.statutCompte === filterStatut : true;
    return matchSearch && matchStatut;
  });

  const today = new Date().toISOString().split('T')[0];

  const ModalError = () => errorVisible ? (
    <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', color: '#dc2626', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
      <AlertCircle size={16} /> {errorVisible}
    </div>
  ) : null;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} color="#0891b2" /> Gestion des Conducteurs
          </h1>
          <p className="page-subtitle">{conducteurs.length} conducteur(s) enregistrés</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar">
            <Search size={16} />
            <input placeholder="Nom, prénom, email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'Inter', background: 'white', cursor: 'pointer' }}>
            <option value="">Tous statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="INACTIF">Inactif</option>
            <option value="SUSPENDU">Suspendu</option>
          </select>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setEditItem(null); setErrorVisible(''); resetForm(); setShowModal(true); }}>
              <Plus size={16} /> Ajouter
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
                  <th>Identité</th>
                  <th>Contact</th>
                  <th>Permis</th>
                  <th>Statut compte</th>
                  <th>Disponibilité</th>
                  <th>Véhicule</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>Aucun conducteur trouvé.</td></tr>
                ) : filtered.map(c => {
                  const statutMeta = STATUT_COMPTE_META[c.statutCompte] || STATUT_COMPTE_META.INACTIF;
                  const dispoMeta  = DISPO_META[c.disponibilite] || DISPO_META.DISPONIBLE;
                  const permisWarn = isPermisExpirant(c.dateExpirationPermis);
                  const permisExp  = isPermisExpire(c.dateExpirationPermis);

                  return (
                    <tr key={c.id} style={{ opacity: c.statutCompte === 'INACTIF' ? 0.6 : 1 }}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{c.prenom} {c.nom}</div>
                        {c.keycloakId && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ID: {c.keycloakId?.substring(0, 8)}...</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Mail size={12} /> {c.email}
                        </div>
                        {c.telephone && (
                          <div style={{ fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                            <Phone size={12} /> {c.telephone}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.83rem' }}>№ {c.numeroPermis}</div>
                        <div style={{ fontSize: '0.73rem', color: permisExp ? '#dc2626' : permisWarn ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                          <Calendar size={11} />
                          {permisExp ? '⚠️ Expiré' : permisWarn ? '⚠️ Expire bientôt' : ''}
                          {' '}{c.dateExpirationPermis?.substring(0, 10)}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${statutMeta.badge}`}>{statutMeta.label}</span>
                      </td>
                      <td>
                        <span className={`badge ${dispoMeta.badge}`}>{dispoMeta.label}</span>
                      </td>
                      <td>
                        {c.vehiculeAssigneId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.83rem', color: '#2563eb', fontWeight: 600 }}>
                            <Car size={13} /> {c.vehiculeAssigneId?.substring(0, 8)}...
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          {/* Détail */}
                          <button className="btn btn-secondary btn-sm" style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }}
                            onClick={() => { setSelectedC(c); setShowDetailModal(true); }} title="Détails">
                            <Info size={13} />
                          </button>
                          {/* Modifier */}
                          <button className="btn btn-primary btn-sm" onClick={() => openEdit(c)} title="Modifier">
                            <Edit3 size={13} />
                          </button>
                          {/* Changer statut compte — Admin */}
                          {isAdmin && c.statutCompte !== 'INACTIF' && (
                            <button className="btn btn-sm" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d' }}
                              onClick={() => { setSelectedC(c); setStatutForm(''); setErrorVisible(''); setShowStatutModal(true); }} title="Changer statut">
                              <ShieldCheck size={13} />
                            </button>
                          )}
                          {/* Changer disponibilité */}
                          {c.statutCompte === 'ACTIF' && (
                            <button className="btn btn-sm" style={{ background: '#dbeafe', color: '#2563eb', border: '1px solid #93c5fd' }}
                              onClick={() => { setSelectedC(c); setDispoForm(c.disponibilite || 'DISPONIBLE'); setErrorVisible(''); setShowDispoModal(true); }} title="Changer disponibilité">
                              <Activity size={13} />
                            </button>
                          )}
                          {/* Désactiver — Admin uniquement */}
                          {isAdmin && c.statutCompte !== 'INACTIF' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDesactiver(c)} title="Désactiver">
                              <Trash2 size={13} />
                            </button>
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

      {/* ---- MODALE CRÉER / MODIFIER ---- */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}><Users size={20} /> {editItem ? 'Modifier le conducteur' : 'Ajouter un conducteur'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <ModalError />
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label>Nom *</label><input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="DUPONT" /></div>
                <div className="form-group"><label>Prénom *</label><input required value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Marc" /></div>
              </div>
              <div className="form-group"><label>Email *</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="m.dupont@sgfv.fr" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label>Téléphone</label><input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="0600000000" /></div>
                <div className="form-group"><label>№ Permis *</label><input required value={form.numeroPermis} onChange={e => setForm({ ...form, numeroPermis: e.target.value })} placeholder="88/76543" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Exp. Permis *</label>
                  <input type="date" min={today} required value={form.dateExpirationPermis} onChange={e => setForm({ ...form, dateExpirationPermis: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Statut</label>
                  <select value={form.statutCompte} onChange={e => setForm({ ...form, statutCompte: e.target.value })}>
                    <option value="ACTIF">Actif</option>
                    <option value="INACTIF">Inactif</option>
                    <option value="SUSPENDU">Suspendu</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODALE CHANGER STATUT COMPTE ---- */}
      {showStatutModal && selectedC && (
        <div className="modal-overlay" onClick={() => setShowStatutModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}><ShieldCheck size={20} /> Changer le statut</h2>
              <button onClick={() => setShowStatutModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <ModalError />
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              Conducteur : <strong>{selectedC.prenom} {selectedC.nom}</strong><br />
              Statut actuel : <span className={`badge ${STATUT_COMPTE_META[selectedC.statutCompte]?.badge}`}>{selectedC.statutCompte}</span>
            </p>
            <form onSubmit={handleChangeStatut}>
              <div className="form-group">
                <label>Nouveau statut</label>
                <select required value={statutForm} onChange={e => setStatutForm(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  {['ACTIF', 'INACTIF', 'SUSPENDU'].filter(s => s !== selectedC.statutCompte).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {(statutForm === 'INACTIF' || statutForm === 'SUSPENDU') && (
                <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e', marginBottom: '1rem' }}>
                  ⚠️ Le véhicule assigné sera automatiquement libéré.
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowStatutModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={!statutForm}>Confirmer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODALE CHANGER DISPONIBILITÉ ---- */}
      {showDispoModal && selectedC && (
        <div className="modal-overlay" onClick={() => setShowDispoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}><Activity size={20} /> Changer la disponibilité</h2>
              <button onClick={() => setShowDispoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <ModalError />
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Conducteur : <strong>{selectedC.prenom} {selectedC.nom}</strong><br />
              Disponibilité actuelle : <span className={`badge ${DISPO_META[selectedC.disponibilite]?.badge}`}>{selectedC.disponibilite}</span>
            </p>
            <form onSubmit={handleChangeDispo}>
              <div className="form-group">
                <label>Nouvelle disponibilité</label>
                <select required value={dispoForm} onChange={e => setDispoForm(e.target.value)}>
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="EN_MISSION">EN_MISSION</option>
                </select>
              </div>
              {dispoForm === 'EN_MISSION' && selectedC.disponibilite !== 'EN_MISSION' && (
                <div style={{ background: '#dbeafe', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', color: '#1e40af', marginBottom: '1rem' }}>
                  ℹ️ Le conducteur ne pourra pas être désactivé tant qu'il est EN_MISSION.
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowDispoModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Confirmer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODALE DÉTAIL ---- */}
      {showDetailModal && selectedC && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}><Users size={20} /> Fiche Conducteur</h2>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                ['NOM', `${selectedC.prenom} ${selectedC.nom}`],
                ['EMAIL', selectedC.email],
                ['TÉLÉPHONE', selectedC.telephone || '—'],
                ['N° PERMIS', selectedC.numeroPermis],
                ['EXP. PERMIS', selectedC.dateExpirationPermis?.substring(0, 10) || '—'],
                ['STATUT COMPTE', selectedC.statutCompte],
                ['DISPONIBILITÉ', selectedC.disponibilite],
                ['VÉHICULE', selectedC.vehiculeAssigneId || 'Non assigné'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                  <div style={{ fontWeight: 600, marginTop: '2px', fontSize: '0.9rem' }}>{val}</div>
                </div>
              ))}
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowDetailModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
