import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import {
  MapPin, Navigation, Car, Loader, Box, Plus, Trash2, History,
  Calendar, X, AlertCircle, RefreshCw, Layers, Map as MapIcon,
  ChevronRight, Info, Zap, ArrowUpRight
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, Polyline, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const LOCALISATION_API = 'http://localhost:8084/api/v1';
const VEHICULES_API     = 'http://localhost:8081/vehicules';

// Plus besoin de RemoteMap, on utilise Leaflet localement


function MapEventsHandler({ isAddingZone, onMapClick }) {
  useMapEvents({
    click(e) {
      if (isAddingZone) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function LocalisationPage() {
  const { keycloak } = useKeycloak();
  const [positions, setPositions] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorHeader, setErrorHeader] = useState('');
  
  // Zones
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZone, setNewZone] = useState({ nom: '', rayonMetres: 500, type: 'AUTORISEE', latitudeCentre: 0, longitudeCentre: 0 });
  
  // Historique / Trajet
  const [historyMode, setHistoryMode] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({ vehiculeId: '', debut: '', fin: '' });
  const [trajet, setTrajet] = useState([]); 
  const [loadingTrajet, setLoadingTrajet] = useState(false);

  const [activeTab, setActiveTab] = useState('vehicules'); 
  const mapRef = useRef();

  const isAdmin = keycloak.hasRealmRole('admin');

  const fetchData = useCallback(async () => {
    const headers = { 'Authorization': `Bearer ${keycloak.token}` };
    try {
      const [vRes, zRes] = await Promise.all([
        fetch(VEHICULES_API, { headers }),
        fetch(`${LOCALISATION_API}/zones`, { headers })
      ]);

      let vData = [];
      if (vRes.ok) {
        vData = await vRes.json();
        setVehicules(vData);
      }
      if (zRes.ok) setZones(await zRes.json());

      const locRes = await fetch(`${LOCALISATION_API}/vehicules`, { headers }).catch(() => null);
      let locData = [];
      if (locRes && locRes.ok) {
        locData = await locRes.json();
      } else {
        locData = vData.filter(v => v.statut === 'EN_MISSION').map(v => ({
          id: v.id, immatriculation: v.plaque, marque: v.marque, modele: v.modele,
          latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
          longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
          vitesse: Math.floor(Math.random() * 90),
          direction: Math.floor(Math.random() * 360)
        }));
      }

      // Si conducteur : ne montrer que son véhicule assigné
      if (!isAdmin) {
        // Récupérer l'ID interne du conducteur connecté via GraphQL
        const profilRes = await fetch('http://localhost:4000/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keycloak.token}` },
          body: JSON.stringify({ query: '{ monProfil { id } }' })
        }).catch(() => null);

        let monId = null;
        if (profilRes && profilRes.ok) {
          const profilData = await profilRes.json();
          monId = profilData?.data?.monProfil?.id;
        }

        if (monId) {
          locData = locData.filter(p => {
            const veh = vData.find(v => v.id === p.id);
            return veh && veh.conducteurAssigneId === monId;
          });
        } else {
          locData = [];
        }
      }

      setPositions(locData);

      // Envoyer les positions au service-localisation pour déclencher le géofencing
      locData.forEach(p => {
        fetch(`${LOCALISATION_API}/positions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keycloak.token}` },
          body: JSON.stringify({ vehiculeId: p.id, latitude: p.latitude, longitude: p.longitude, vitesse: p.vitesse || 0, direction: p.direction || 0 })
        }).catch(() => null);
      });

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [keycloak.token, isAdmin]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchTrajet = async () => {
    if (!historyFilters.vehiculeId) return;
    setLoadingTrajet(true);
    setErrorHeader('');
    try {
      let url = `${LOCALISATION_API}/positions/vehicule/${historyFilters.vehiculeId}`;
      if (historyFilters.debut && historyFilters.fin) {
        url += `?debut=${historyFilters.debut}&fin=${historyFilters.fin}`;
      }
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${keycloak.token}` } });
      if (res.ok) {
        const data = await res.json();
        const coords = data.map(p => [p.latitude, p.longitude]);
        setTrajet(coords);
      } else {
        setTrajet([]);
        setErrorHeader("Aucun trajet trouvé.");
      }
    } catch (err) { 
      setErrorHeader("Erreur récupération trajet.");
      setTrajet([]);
    } finally {
      setLoadingTrajet(false);
    }
  };

  const saveZone = async (e) => {
    e.preventDefault();
    setErrorHeader('');
    try {
      const res = await fetch(`${LOCALISATION_API}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keycloak.token}` },
        body: JSON.stringify(newZone)
      });
      if (res.ok) {
        setShowZoneModal(false);
        fetchData();
        setActiveTab('zones');
      } else {
        const j = await res.json();
        setErrorHeader(j.error || "Erreur création zone");
      }
    } catch (err) { setErrorHeader(err.message); }
  };

  const deleteZone = async (id) => {
    if (!window.confirm('Supprimer cette zone ?')) return;
    try {
      await fetch(`${LOCALISATION_API}/zones/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${keycloak.token}` } 
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title"><MapPin size={24} color="#10b981" /> Géo-Localisation</h1>
          <p className="page-subtitle">{positions.length} véhicule(s) suivis — Mode Hybride Micro-Frontend</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isAdmin && (
            <button className={`btn ${isAddingZone ? 'btn-danger' : 'btn-primary'}`} onClick={() => setIsAddingZone(!isAddingZone)}>
              <Box size={16} /> {isAddingZone ? 'Annuler' : 'Placer Zone'}
            </button>
          )}
          <button className={`btn ${historyMode ? 'btn-success' : 'btn-secondary'}`} onClick={() => { setHistoryMode(!historyMode); setTrajet([]); }}>
            <History size={16} /> {historyMode ? 'Live' : 'Historique'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>
        
        {/* Panel GAUCHE */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
            <button onClick={() => setActiveTab('vehicules')} style={{ flex: 1, padding: '1rem', border: 'none', background: activeTab === 'vehicules' ? 'white' : '#f8fafc', borderBottom: activeTab === 'vehicules' ? '2px solid #2563eb' : 'none', fontWeight: 600, fontSize: '0.85rem' }}>Véhicules</button>
            <button onClick={() => setActiveTab('zones')} style={{ flex: 1, padding: '1rem', border: 'none', background: activeTab === 'zones' ? 'white' : '#f8fafc', borderBottom: activeTab === 'zones' ? '2px solid #2563eb' : 'none', fontWeight: 600, fontSize: '0.85rem' }}>Zones ({zones.length})</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {activeTab === 'vehicules' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {positions.map(p => (
                  <div key={p.id} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }} className="hover-light">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.immatriculation}</span>
                      <span style={{ fontSize: '0.7rem', color: '#10b981' }}>● Live</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.marque} {p.modele}</div>
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.6rem', fontSize: '0.7rem' }}>
                      <Zap size={10} /> {p.vitesse || 0} km/h | <Navigation size={10} style={{ transform: `rotate(${p.direction || 0}deg)` }} /> {p.direction || 0}°
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {zones.map(z => (
                  <div key={z.id} style={{ padding: '0.75rem', borderRadius: '8px', background: z.type === 'INTERDITE' ? '#fef2f2' : '#f0fdf4', border: '1px solid #e1e1e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{z.nom}</span>
                      {isAdmin && <button onClick={() => deleteZone(z.id)} style={{ color: '#dc2626', background: 'none', border: 'none' }}><Trash2 size={14} /></button>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rayon: {z.rayonMetres}m | {z.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CARTE (DÉLÉGUÉE AU MICRO-FRONTEND MF-CARTE) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {historyMode && (
            <div className="card" style={{ padding: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }} className="form-group">
                <label style={{fontSize:'0.75rem'}}>Véhicule</label>
                <select value={historyFilters.vehiculeId} style={{width:'100%', padding:'0.4rem'}} onChange={e => setHistoryFilters({...historyFilters, vehiculeId: e.target.value})}>
                  <option value="">Choisir...</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.plaque} ({v.marque})</option>)}
                </select>
              </div>
              <div style={{width:'140px'}} className="form-group"><label style={{fontSize:'0.75rem'}}>Début</label><input type="datetime-local" value={historyFilters.debut} style={{width:'100%', padding:'0.3rem'}} onChange={e => setHistoryFilters({...historyFilters, debut: e.target.value})} /></div>
              <div style={{width:'140px'}} className="form-group"><label style={{fontSize:'0.75rem'}}>Fin</label><input type="datetime-local" value={historyFilters.fin} style={{width:'100%', padding:'0.3rem'}} onChange={e => setHistoryFilters({...historyFilters, fin: e.target.value})} /></div>
              <button className="btn btn-primary btn-sm" onClick={fetchTrajet} disabled={loadingTrajet || !historyFilters.vehiculeId}>Tracer</button>
            </div>
          )}

          <div className="card" style={{ padding: 0, flex: 1, overflow: 'hidden', position: 'relative', minHeight: '400px' }}>
            {isAddingZone && (
              <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(37, 99, 235, 0.9)', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
                📍 Cliquez sur la carte pour définir le centre de la zone
              </div>
            )}
            <MapContainer center={[48.8566, 2.3522]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <ZoomControl position="bottomright" />
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Gestionnaire de clic pour ajouter une zone */}
              <MapEventsHandler 
                isAddingZone={isAddingZone} 
                onMapClick={(lat, lng) => {
                  setNewZone({ ...newZone, latitudeCentre: lat, longitudeCentre: lng });
                  setShowZoneModal(true);
                  setIsAddingZone(false);
                }} 
              />

              {positions.map(p => (
                <Marker key={p.id} position={[p.latitude, p.longitude]}>
                  <Popup>
                    <div style={{ fontWeight: 700 }}>{p.immatriculation}</div>
                    <div style={{ fontSize: '0.8rem' }}>{p.marque} {p.modele}</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Vitesse: {p.vitesse || 0} km/h</div>
                  </Popup>
                </Marker>
              ))}

              {/* Affichage des zones */}
              {zones.map(z => (
                <Circle
                  key={z.id}
                  center={[z.latitudeCentre, z.longitudeCentre]}
                  radius={z.rayonMetres}
                  pathOptions={{
                    fillColor: z.type === 'INTERDITE' ? '#ef4444' : '#10b981',
                    color: z.type === 'INTERDITE' ? '#dc2626' : '#059669',
                    fillOpacity: 0.2
                  }}
                >
                  <Popup>{z.nom} ({z.type})</Popup>
                </Circle>
              ))}

              {/* Historique : Tracé du trajet */}
              {historyMode && trajet.length > 1 && (
                <Polyline positions={trajet} color="#2563eb" weight={4} dashArray="5, 10" />
              )}
            </MapContainer>
          </div>
        </div>
      </div>

      {showZoneModal && (
        <div className="modal-overlay" onClick={() => setShowZoneModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}><Box size={20} /> Nouvelle Zone</h2>
              <button onClick={() => setShowZoneModal(false)}><X size={20} /></button>
            </div>
            {errorHeader && <div className="alert alert-danger">{errorHeader}</div>}
            <form onSubmit={saveZone}>
              <div className="form-group"><label>Nom *</label><input required value={newZone.nom} onChange={e => setNewZone({ ...newZone, nom: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label>Rayon (m)</label><input type="number" required value={newZone.rayonMetres} onChange={e => setNewZone({ ...newZone, rayonMetres: parseInt(e.target.value) })} /></div>
                <div className="form-group"><label>Type</label>
                  <select value={newZone.type} onChange={e => setNewZone({ ...newZone, type: e.target.value })}>
                    <option value="AUTORISEE">Autorisée</option>
                    <option value="INTERDITE">Interdite</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowZoneModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer Zone</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
