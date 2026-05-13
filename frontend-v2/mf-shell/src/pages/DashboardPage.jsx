import React, { useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { Car, Users, Wrench, AlertTriangle, MapPin, Activity, Clock, Shield, TrendingUp, ShieldCheck } from 'lucide-react';

export default function DashboardPage({ userRole, userName }) {
  const { keycloak } = useKeycloak();
  const [stats, setStats] = useState({
    vehicules: 0, conducteurs: 0, maintenances: 0, alertes: 0, enService: 0
  });
  const [recentVehicules, setRecentVehicules] = useState([]);
  const [recentMaintenances, setRecentMaintenances] = useState([]);
  const [loading, setLoading] = useState(true);

  const [myProfile, setMyProfile] = useState(null);
  const [assignedVehicle, setAssignedVehicle] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const fetchAll = async () => {
    try {
      const query = `
        query GetDashboardData {
          vehicules { id plaque statut marque modele dateAjout }
          conducteurs { id }
          maintenances { id statut typeIntervention dateCreation technicienId }
          alertes(estLu: false) { id }
          mesAlertes { id }
          monProfil { id prenom nom email vehiculeAssigneId }
        }
      `;

      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keycloak.token}`
        },
        body: JSON.stringify({ query })
      });

      const result = await response.json();
      if (!result.data) return;

      const { vehicules, conducteurs, maintenances, alertes, mesAlertes, monProfil } = result.data;
      setMyProfile(monProfil);

      if (monProfil?.vehiculeAssigneId && vehicules) {
        const assigned = vehicules.find(v => v.id === monProfil.vehiculeAssigneId);
        setAssignedVehicle(assigned);
      }

      const isAdmin = keycloak.hasRealmRole('admin');
      const isTechnicien = userRole === 'technicien';
      const isConducteur = userRole === 'conducteur';

      setStats({
        vehicules: vehicules ? vehicules.length : 0,
        conducteurs: conducteurs ? conducteurs.length : 0,
        maintenances: (maintenances && isTechnicien && !isAdmin && monProfil)
          ? maintenances.filter(m => m.technicienId === monProfil.id && m.statut !== 'TERMINEE').length
          : (maintenances?.filter(m => m.statut !== 'TERMINEE').length || 0),
        alertes: isConducteur ? (mesAlertes?.length || 0) : (alertes?.length || 0),
        enService: vehicules ? vehicules.filter(v => v.statut === 'EN_MISSION' || v.statut === 'EN_SERVICE').length : 0,
      });

      const sortedVehicules = vehicules ? [...vehicules].sort((a, b) =>
        new Date(b.dateAjout || 0) - new Date(a.dateAjout || 0)
      ) : [];

      let filteredMaintenances = maintenances ? [...maintenances] : [];
      if (isTechnicien && !isAdmin && monProfil) {
        filteredMaintenances = filteredMaintenances.filter(m => m.technicienId === monProfil.id);
      }

      const sortedMaintenances = filteredMaintenances.sort((a, b) =>
        new Date(b.dateCreation || 0) - new Date(a.dateCreation || 0)
      );

      setRecentVehicules(sortedVehicules.slice(0, 5));
      setRecentMaintenances(sortedMaintenances.slice(0, 5));
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (keycloak.token) {
      fetchAll();
    }
  }, [keycloak.token]);

  const handleUpdateStatus = async (newStatus) => {
    if (!assignedVehicle) return;
    setUpdatingStatus(true);
    try {
      const mutation = `
        mutation ChangerStatutVehicule($id: ID!, $statut: StatutVehicule!) {
          changerStatutVehicule(id: $id, statut: $statut) {
            id
            statut
          }
        }
      `;

      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keycloak.token}`
        },
        body: JSON.stringify({
          query: mutation,
          variables: { id: assignedVehicle.id, statut: newStatus }
        })
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      await fetchAll();
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSignalerPanne = async () => {
    if (!myProfile?.vehiculeAssigneId) return;

    if (!window.confirm("Voulez-vous vraiment signaler une panne sur votre véhicule actuel ?")) return;

    setReporting(true);
    try {
      const mutation = `
        mutation SignalerPanne($vId: ID!) {
          signalerMaintenance(vehiculeId: $vId, typeIntervention: "PANNE", description: "Panne signalée par le conducteur via le dashboard") {
            id
            statut
          }
        }
      `;

      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keycloak.token}`
        },
        body: JSON.stringify({
          query: mutation,
          variables: { vId: myProfile.vehiculeAssigneId }
        })
      });

      const result = await response.json();
      if (result.errors) {
        alert("Erreur lors du signalement : " + result.errors[0].message);
      } else {
        setReportSuccess(true);
        setTimeout(() => setReportSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Error reporting breakdown:', err);
      alert("Une erreur est survenue.");
    } finally {
      setReporting(false);
    }
  };

  const roleLabels = {
    admin: { label: 'Administrateur', desc: 'Accès total au système', color: '#dc2626', bg: '#fee2e2' },
    technicien: { label: 'Technicien', desc: 'Gestion des maintenances et alertes critiques', color: '#d97706', bg: '#fef3c7' },
    conducteur: { label: 'Conducteur', desc: 'Suivi de votre véhicule et trajets', color: '#2563eb', bg: '#dbeafe' }
  };
  const rl = roleLabels[userRole] || roleLabels.admin;

  const statCards = [
    { icon: Car, label: 'Véhicules', value: stats.vehicules, bg: 'blue', roles: ['admin'] },
    { icon: Users, label: 'Conducteurs', value: stats.conducteurs, bg: 'cyan', roles: ['admin'] },
    { icon: Wrench, label: 'Maintenances', value: stats.maintenances, bg: 'orange', roles: ['admin', 'technicien'] },
    { icon: AlertTriangle, label: 'Alertes actives', value: stats.alertes, bg: 'red', roles: ['admin', 'technicien', 'conducteur'] },
    { icon: MapPin, label: 'En service', value: stats.enService, bg: 'green', roles: ['admin', 'conducteur'] },
  ].filter(s => s.roles.includes(userRole));

  const statusBadge = (s) => {
    if (s === 'EN_SERVICE' || s === 'EN_MISSION') return 'badge-success';
    if (s === 'EN_MAINTENANCE') return 'badge-warning';
    if (s === 'HORS_SERVICE' || s === 'EN_PANNE') return 'badge-danger';
    return 'badge-info';
  };

  return (
    <div className="page-enter">
      {/* Hero Banner */}
      <div className="hero-banner">
        <img src="/images/fleet-banner.png" alt="Flotte" />
        <div className="hero-overlay">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={28} /> Bonjour, {userName}
          </h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ background: rl.bg, color: rl.color, padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
              <Shield size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{rl.label}
            </span>
            <span style={{ opacity: 0.9 }}>{rl.desc}</span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div className="stat-card" key={i}>
              <div className={`stat-icon ${s.bg}`}><Icon size={24} /></div>
              <div className="stat-info">
                <h3>{loading ? '...' : s.value}</h3>
                <p>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tables - visibles uniquement pour admin et technicien */}
      {(userRole === 'admin' || userRole === 'technicien') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {userRole === 'admin' && (
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Car size={18} color="#2563eb" /> Derniers véhicules
              </h2>
              {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>Chargement...</p> :
                recentVehicules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    <Car size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><p>Aucun véhicule</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Plaque</th><th>Véhicule</th><th>Statut</th></tr></thead>
                    <tbody>{recentVehicules.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600 }}>{v.plaque || v.immatriculation}</td>
                        <td>{v.marque} {v.modele}</td>
                        <td><span className={`badge ${statusBadge(v.statut)}`}>{v.statut}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
            </div>
          )}

          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={18} color="#d97706" /> Dernières maintenances
            </h2>
            {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>Chargement...</p> :
              recentMaintenances.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <Wrench size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><p>Aucune maintenance</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Type</th><th>Date</th><th>Statut</th></tr></thead>
                  <tbody>{recentMaintenances.map(m => (
                    <tr key={m.id}>
                      <td>{m.typeIntervention}</td>
                      <td>{m.dateCreation ? new Date(m.dateCreation).toLocaleDateString() : '—'}</td>
                      <td><span className={`badge ${m.statut === 'TERMINEE' ? 'badge-success' : m.statut === 'EN_COURS' ? 'badge-warning' : 'badge-info'}`}>{m.statut}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
          </div>
        </div>
      )}

      {/* Conducteur : message personnalisé et action de signalement */}
      {userRole === 'conducteur' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '20px',
              background: '#eff6ff', color: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Car size={32} />
            </div>
            <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Votre véhicule assigné</h3>
            {assignedVehicle ? (
              <div style={{ marginTop: '0.5rem', width: '100%' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                  {assignedVehicle.marque} {assignedVehicle.modele}
                </div>
                <div style={{
                  display: 'inline-block', marginTop: '0.75rem',
                  padding: '0.4rem 1rem', background: '#f8fafc',
                  border: '2px solid #e2e8f0', borderRadius: '8px',
                  fontFamily: 'monospace', fontWeight: 700, color: '#475569',
                  fontSize: '1.1rem', letterSpacing: '1px'
                }}>
                  {assignedVehicle.plaque}
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  {assignedVehicle.statut === 'DISPONIBLE' && (
                    <button
                      className="btn btn-primary"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus('EN_MISSION')}
                      style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <MapPin size={16} /> {updatingStatus ? '...' : 'Commencer Mission'}
                    </button>
                  )}
                  {assignedVehicle.statut === 'EN_MISSION' && (
                    <button
                      className="btn btn-success"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus('DISPONIBLE')}
                      style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <ShieldCheck size={16} /> {updatingStatus ? '...' : 'Terminer Mission'}
                    </button>
                  )}
                  {assignedVehicle.statut === 'EN_MAINTENANCE' && (
                    <div style={{ background: '#fffbeb', color: '#92400e', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                      Véhicule en maintenance 🛠️
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Car size={48} color="#94a3b8" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Aucun véhicule assigné</h3>
                <p style={{ color: '#cbd5e1', textAlign: 'center' }}>
                  Vous ne pouvez pas effectuer de mission tant qu'un véhicule ne vous a pas été attribué.
                </p>
              </>
            )}
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', border: '2px dashed #e2e8f0' }}>
            {myProfile?.vehiculeAssigneId ? (
              <>
                <AlertTriangle size={48} color={reportSuccess ? "#10b981" : "#f59e0b"} style={{ marginBottom: '1rem' }} />
                <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Signaler un problème ?</h3>
                <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '1.5rem' }}>
                  Si vous rencontrez une panne avec votre véhicule assigné, vous pouvez en informer la maintenance.
                </p>
                {reportSuccess ? (
                  <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600 }}>
                    Panne signalée avec succès !
                  </div>
                ) : (
                  <button
                    onClick={handleSignalerPanne}
                    disabled={reporting}
                    className="btn btn-danger"
                    style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 600 }}
                  >
                    {reporting ? 'Envoi...' : 'Signaler une panne'}
                  </button>
                )}
              </>
            ) : (
              <>
                <Car size={48} color="#94a3b8" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <h3 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Aucun véhicule assigné</h3>
                <p style={{ color: '#cbd5e1', textAlign: 'center' }}>
                  Vous ne pouvez pas signaler de panne tant qu'un véhicule ne vous a pas été attribué.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
