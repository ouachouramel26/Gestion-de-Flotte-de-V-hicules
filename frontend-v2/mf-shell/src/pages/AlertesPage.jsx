import React, { useState, useEffect, useCallback } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import {
  Bell, AlertTriangle, Info, CheckCircle, Clock, Eye,
  Car, ShieldAlert, Zap, Filter, Trash2, RefreshCw, X
} from 'lucide-react';

const GRAPHQL_URL = 'http://localhost:4000/graphql';

// 8 types d'événements définis dans le spec
const EVENT_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'VEHICULE_ASSIGNE', label: 'Véhicule assigné' },
  { value: 'REVISION_PLANIFIEE', label: 'Maintenance planifiée' },
  { value: 'MAINTENANCE_DEBUTEE', label: 'Maintenance débutée' },
  { value: 'PERMIS_EXPIRE', label: 'Permis expirant' },
  { value: 'SEUIL_KM_ATTEINT', label: 'Seuil km atteint' },
  { value: 'MAINTENANCE_TERMINEE', label: 'Maintenance terminée' },
  { value: 'PANNE_SIGNALEE', label: 'Panne signalée' },
  { value: 'SORTIE_ZONE', label: 'Entrée zone interdite' },
  { value: 'VITESSE_EXCESSIVE', label: 'Vitesse excessive' },
];

const NIVEAUX = ['', 'INFO', 'AVERTISSEMENT', 'CRITIQUE', 'URGENCE'];

const SEVERITY_CONFIG = {
  URGENCE: {
    color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd',
    icon: Zap, badge: 'badge-urgence', label: 'URGENCE', pulse: true
  },
  CRITIQUE: {
    color: '#dc2626', bg: '#fee2e2', border: '#fca5a5',
    icon: ShieldAlert, badge: 'badge-danger', label: 'CRITIQUE', pulse: false
  },
  AVERTISSEMENT: {
    color: '#d97706', bg: '#fef3c7', border: '#fcd34d',
    icon: AlertTriangle, badge: 'badge-warning', label: 'AVERTISSEMENT', pulse: false
  },
  INFO: {
    color: '#2563eb', bg: '#dbeafe', border: '#93c5fd',
    icon: Info, badge: 'badge-info', label: 'INFO', pulse: false
  }
};

export default function AlertesPage({ userRole }) {
  const { keycloak } = useKeycloak();
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState(keycloak.hasRealmRole('admin') ? 'ALL' : 'MOI');
  const [filterNiveau, setFilterNiveau] = useState('');
  const [filterType, setFilterType] = useState('');

  const isAdmin = keycloak.hasRealmRole('admin');
  const isConducteur = keycloak.hasRealmRole('conducteur') && !isAdmin;

  const fetchAlertes = useCallback(async () => {
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            query($niveau: NiveauAlerte, $typeEvenement: TypeEvenementAlerte, $role: RoleDestinataire) {
              alertes(niveau: $niveau, typeEvenement: $typeEvenement, role: $role) {
                id typeEvenement niveau message vehiculeId utilisateurId estLu dateCreation plaque roleDestinataire
              }
              mesAlertes {
                id typeEvenement niveau message vehiculeId utilisateurId estLu dateCreation plaque roleDestinataire
              }
            }
          `,
          variables: {
            niveau: filterNiveau || null,
            typeEvenement: filterType || null,
            role: userRole === 'admin' ? "ADMIN" : (userRole === 'technicien' ? "TECHNICIEN" : null)
          }
        })
      });
      const json = await res.json();
      if (json.data) {
        setAlertes(filterMode === 'MOI' ? json.data.mesAlertes : json.data.alertes);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [keycloak.token, filterMode, filterNiveau, filterType]);

  useEffect(() => { fetchAlertes(); }, [fetchAlertes]);

  // Auto-refresh toutes les 30s pour détecter nouvelles URGENCES
  useEffect(() => {
    const interval = setInterval(fetchAlertes, 30000);
    return () => clearInterval(interval);
  }, [fetchAlertes]);

  // PATCH /alertes/:id/lire
  const handleLire = async (id) => {
    try {
      await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `mutation($id: ID!) { marquerAlerteLue(id: $id) { id estLu } }`,
          variables: { id }
        })
      });
      fetchAlertes();
    } catch (err) { console.error(err); }
  };

  // DELETE /alertes/:id — Admin uniquement
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette alerte définitivement ?')) return;
    try {
      await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `mutation($id: ID!) { supprimerAlerte(id: $id) }`,
          variables: { id }
        })
      });
      fetchAlertes();
      toast.success('Alerte supprimée');
    } catch (err) { console.error(err); }
  };

  // Marquer toutes comme lues
  const handleLireTout = async () => {
    const nonLues = alertes.filter(a => !a.estLu);
    try {
      await Promise.all(nonLues.map(a =>
        fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${keycloak.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: `mutation($id: ID!) { marquerAlerteLue(id: $id) { id } }`,
            variables: { id: a.id }
          })
        })
      ));
      fetchAlertes();
      toast.success('Toutes les alertes sont marquées comme lues');
    } catch (err) { console.error(err); }
  };

  // Filtrage local
  let filtered = [...alertes];
  if (filterMode === 'UNREAD') filtered = filtered.filter(a => !a.estLu);
  if (filterNiveau) filtered = filtered.filter(a => a.niveau === filterNiveau || a.severite === filterNiveau);
  if (filterType) filtered = filtered.filter(a => a.typeEvenement === filterType);

  // Tri : non lus d'abord, puis par date desc
  filtered.sort((a, b) => {
    if (a.estLu !== b.estLu) return a.estLu ? 1 : -1;
    return new Date(b.dateCreation) - new Date(a.dateCreation);
  });

  const nonLuCount = alertes.filter(a => !a.estLu).length;
  const urgenceCount = alertes.filter(a => !a.estLu && (a.niveau === 'URGENCE' || a.severite === 'URGENCE')).length;

  return (
    <div className="page-enter">
      <style>{`
        @keyframes pulse-urgence {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(124, 58, 237, 0); }
        }
        .urgence-pulse { animation: pulse-urgence 2s ease infinite; }
        .badge-urgence { background: #ede9fe; color: #7c3aed; }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={28} color="#2563eb" />
            Centre de Notifications
            {nonLuCount > 0 && (
              <span style={{ background: '#dc2626', color: 'white', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', marginLeft: '0.25rem' }}>
                {nonLuCount}
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            {nonLuCount} non lue(s)
            {urgenceCount > 0 && (
              <span style={{ marginLeft: '0.75rem', color: '#7c3aed', fontWeight: 700 }}>
                ⚡ {urgenceCount} URGENCE(S)
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtres mode */}
          <div style={{ display: 'flex', gap: '0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {[
              { key: 'MOI', label: isAdmin ? 'Alertes Admin' : 'Mes alertes' },
              { key: 'ALL', label: 'Toutes' },
              { key: 'UNREAD', label: 'Non lues' }
            ].map(f => (
              <button key={f.key}
                style={{ padding: '0.5rem 0.9rem', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, background: filterMode === f.key ? '#2563eb' : 'white', color: filterMode === f.key ? 'white' : '#64748b', transition: 'all 0.2s' }}
                onClick={() => setFilterMode(f.key)}>{f.label}
              </button>
            ))}
          </div>

          {/* Filtre niveau */}
          <select value={filterNiveau} onChange={e => setFilterNiveau(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontFamily: 'Inter', background: 'white', cursor: 'pointer' }}>
            {NIVEAUX.map(n => <option key={n} value={n}>{n || 'Tous niveaux'}</option>)}
          </select>

          {/* Filtre type */}
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontFamily: 'Inter', background: 'white', cursor: 'pointer' }}>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          {/* Actions */}
          <button className="btn btn-secondary" style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }} onClick={fetchAlertes}>
            <RefreshCw size={14} />
          </button>
          {nonLuCount > 0 && (
            <button className="btn btn-primary" onClick={handleLireTout}>
              <CheckCircle size={14} /> Tout lire
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Chargement des alertes...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ fontSize: '1rem', fontWeight: 500 }}>Aucune alerte à afficher.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Tout est en ordre.</p>
          </div>
        ) : (
          <div>
            {filtered.map(a => {
              const niveau = a.niveau || a.severite || 'INFO';
              const config = SEVERITY_CONFIG[niveau] || SEVERITY_CONFIG.INFO;
              const SevIcon = config.icon;
              const isUrgence = niveau === 'URGENCE';

              return (
                <div key={a.id} style={{
                  display: 'flex', gap: '1rem', padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid #f1f5f9',
                  background: a.estLu ? '#fafafa' : `${config.bg}44`,
                  borderLeft: `4px solid ${a.estLu ? '#e2e8f0' : config.color}`,
                  transition: 'all 0.2s',
                  opacity: a.estLu ? 0.72 : 1
                }}>
                  {/* Icône */}
                  <div className={isUrgence && !a.estLu ? 'urgence-pulse' : ''} style={{
                    width: '44px', height: '44px', borderRadius: '11px',
                    background: config.bg, color: config.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: `1px solid ${config.border}`
                  }}>
                    <SevIcon size={20} />
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
                        {EVENT_TYPES.find(t => t.value === a.typeEvenement)?.label || (a.typeEvenement || '').replace(/_/g, ' ')}
                      </span>
                      <span className={`badge ${config.badge}`} style={{ fontSize: '0.62rem', padding: '0.15rem 0.55rem' }}>
                        {config.label}
                      </span>
                      {!a.estLu && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: config.color, display: 'inline-block' }} />
                      )}
                    </div>

                    <p style={{ margin: 0, color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      {a.message || '—'}
                    </p>

                    <div style={{ marginTop: '0.6rem', display: 'flex', gap: '1.25rem', alignItems: 'center', fontSize: '0.73rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} /> {new Date(a.dateCreation).toLocaleString('fr-FR')}
                      </span>
                      {a.estLu && a.dateLecture && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#10b981' }}>
                          <Eye size={11} /> Lu le {new Date(a.dateLecture).toLocaleString('fr-FR')}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#2563eb', fontWeight: 600 }}>
                        <Car size={11} /> {a.plaque || (a.vehiculeId ? a.vehiculeId.substring(0, 8) + '...' : '—')}
                      </span>
                      {a.roleDestinataire && (
                        <span style={{ background: '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                          → {a.roleDestinataire}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end', flexShrink: 0 }}>
                    {!a.estLu && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleLire(a.id)} title="Marquer comme lue"
                        style={{ fontSize: '0.75rem' }}>
                        <Eye size={13} /> Lire
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-sm" onClick={() => handleDelete(a.id)} title="Supprimer"
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '0.75rem' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
