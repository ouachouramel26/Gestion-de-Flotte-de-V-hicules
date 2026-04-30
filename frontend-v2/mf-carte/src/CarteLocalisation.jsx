import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { gql, useQuery } from '@apollo/client';
import L from 'leaflet';

// Loader magique de Webpack/Vite pour les icones
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Requête GraphQL
const GET_VEHICULES_LOCALISATION = gql`
  query {
    vehiculesByStatus(statut: "EN_SERVICE") {
      id
      immatriculation
      marque
      modele
    }
  }
`;

export default function CarteLocalisation() {
    const { loading, error, data } = useQuery(GET_VEHICULES_LOCALISATION, {
        pollInterval: 5000,
    });

    const [positionsMock, setPositionsMock] = useState({});

    // Génération de positions aléatoires (Paris) pour la démo
    useEffect(() => {
        if (data && data.vehiculesByStatus) {
            const positions = {};
            data.vehiculesByStatus.forEach(v => {
                positions[v.id] = [
                    48.8566 + (Math.random() - 0.5) * 0.1, // Lat Paris approx
                    2.3522 + (Math.random() - 0.5) * 0.1  // Lng Paris approx
                ];
            });
            setPositionsMock(positions);
        }
    }, [data]);

    if (loading) return <div style={{padding:'20px', color:'#3b82f6'}}>Recherche des signaux GPS des véhicules...</div>;
    
    // Si l'API Gateway n'est pas allumée !
    if (error) {
        return (
            <div style={{padding:'20px'}}>
                <div style={{color:'red', marginBottom:'10px'}}>⚠️ Carence de communication avec le Serveur GraphQL.</div>
                <p style={{color:'#94a3b8', fontSize:'0.9rem'}}>{error.message}</p>
                <div style={{marginTop:'20px', padding:'15px', background:'rgba(255,0,0,0.1)', borderRadius:'8px', border:'1px solid rgba(255,0,0,0.3)'}}>
                    Avez-vous lancé <code>node index.js</code> dans le dossier <strong>api</strong> (API Gateway sur le port 4000) ?
                </div>
            </div>
        );
    }

    const vehicules = data?.vehiculesByStatus || [];

    return (
        <MapContainer center={[48.8566, 2.3522]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {vehicules.map(v => (
                positionsMock[v.id] && (
                    <Marker key={v.id} position={positionsMock[v.id]}>
                        <Popup>
                            <div style={{fontWeight: 'bold', color:'#3b82f6', fontSize:'1.1em'}}>{v.immatriculation}</div>
                            <div style={{color:'#94a3b8'}}>{v.marque} {v.modele}</div>
                            <div style={{marginTop:'5px', color:'#10b981'}}>● EN_SERVICE</div>
                        </Popup>
                    </Marker>
                )
            ))}
        </MapContainer>
    );
}
