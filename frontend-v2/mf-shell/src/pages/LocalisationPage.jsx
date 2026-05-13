import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import {
  MapPin, Navigation, Car, Loader, Box, Plus, Trash2, History,
  Calendar, X, AlertCircle, RefreshCw, Layers, Map as MapIcon,
  ChevronRight, Info, Zap, ArrowUpRight, User
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, Polyline, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const GRAPHQL_URL = 'http://localhost:4000/graphql';

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
    try {
      const query = `
        query {
          vehicules { id plaque marque modele statut conducteurAssigneId conducteurAssigne { nom prenom } }
          zones { id nom type latitudeCentre longitudeCentre rayonMetres }
          positionsActuelles { vehiculeId latitude longitude vitesse direction }
          monProfil { id }
        }
      `;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      const json = await res.json();
      console.log("[LocalisationPage] GraphQL response:", json);
      if (json.data) {
        const vData = json.data.vehicules || [];
        setVehicules(vData);
        setZones(json.data.zones || []);

        let locData = json.data.positionsActuelles || [];

        // 1. Identifier tous les véhicules "EN_MISSION"
        let vehiclesInMission = vData.filter(v => v.statut === 'EN_MISSION');

        // 2. Filtrer par conducteur si nécessaire
        if (!isAdmin) {
          const monId = json.data.monProfil?.id;
          if (monId) {
            vehiclesInMission = vehiclesInMission.filter(v => v.conducteurAssigneId === monId);
          }
        }

        // 3. Fusionner avec les positions réelles ou générer des fallbacks
        const finalPositions = vehiclesInMission.map(v => {
          const realPos = locData.find(p => p.vehiculeId === v.id);

          if (realPos) {
            return {
              ...realPos,
              id: v.id,
              vehiculeId: v.id,
              immatriculation: v.plaque,
              marque: v.marque,
              modele: v.modele,
              statut: v.statut,
              conducteur: v.conducteurAssigne ? `${v.conducteurAssigne.nom} ${v.conducteurAssigne.prenom}` : 'Non assigné'
            };
          } else {
            // Pas de position réelle : Fallback statique
            return {
              id: v.id,
              vehiculeId: v.id,
              immatriculation: v.plaque,
              marque: v.marque,
              modele: v.modele,
              statut: v.statut,
              conducteur: v.conducteurAssigne ? `${v.conducteurAssigne.nom} ${v.conducteurAssigne.prenom}` : 'Non assigné',
              latitude: 48.8566 + (Math.random() - 0.5) * 0.02,
              longitude: 2.3522 + (Math.random() - 0.5) * 0.02,
              vitesse: 0,
              direction: 0
            };
          }
        });

        setPositions(finalPositions);
      }
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
      const query = `
        query($id: ID!, $d: String, $f: String) {
          trajetVehicule(vehiculeId: $id, debut: $d, fin: $f) {
            latitude longitude vitesse horodatage
          }
        }
      `;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: {
            id: historyFilters.vehiculeId,
            d: historyFilters.debut || null,
            f: historyFilters.fin || null
          }
        })
      });
      const json = await res.json();
      if (json.data && json.data.trajetVehicule) {
        const coords = json.data.trajetVehicule.map(p => [p.latitude, p.longitude]);
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
      const query = `
        mutation($n: String!, $t: TypeZone!, $lat: Float!, $lon: Float!, $r: Int!) {
          creerZone(nom: $n, type: $t, latitudeCentre: $lat, longitudeCentre: $lon, rayonMetres: $r) { id }
        }
      `;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: {
            n: newZone.nom,
            t: newZone.type,
            lat: parseFloat(newZone.latitudeCentre),
            lon: parseFloat(newZone.longitudeCentre),
            r: parseInt(newZone.rayonMetres)
          }
        })
      });
      const json = await res.json();
      if (json.data) {
        setShowZoneModal(false);
        fetchData();
        setActiveTab('zones');
      } else if (json.errors) {
        setErrorHeader(json.errors[0].message);
      }
    } catch (err) { setErrorHeader(err.message); }
  };

  const deleteZone = async (id) => {
    if (!window.confirm('Supprimer cette zone ?')) return;
    try {
      await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `mutation($id: ID!) { supprimerZone(id: $id) }`,
          variables: { id }
        })
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
                <label style={{ fontSize: '0.75rem' }}>Véhicule</label>
                <select value={historyFilters.vehiculeId} style={{ width: '100%', padding: '0.4rem' }} onChange={e => setHistoryFilters({ ...historyFilters, vehiculeId: e.target.value })}>
                  <option value="">Choisir...</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.plaque} ({v.marque})</option>)}
                </select>
              </div>
              <div style={{ width: '140px' }} className="form-group"><label style={{ fontSize: '0.75rem' }}>Début</label><input type="datetime-local" value={historyFilters.debut} style={{ width: '100%', padding: '0.3rem' }} onChange={e => setHistoryFilters({ ...historyFilters, debut: e.target.value })} /></div>
              <div style={{ width: '140px' }} className="form-group"><label style={{ fontSize: '0.75rem' }}>Fin</label><input type="datetime-local" value={historyFilters.fin} style={{ width: '100%', padding: '0.3rem' }} onChange={e => setHistoryFilters({ ...historyFilters, fin: e.target.value })} /></div>
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
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', marginTop: '4px' }}>
                      <User size={12} style={{ verticalAlign: 'middle', marginRight: '2px' }} /> {p.conducteur}
                    </div>
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
