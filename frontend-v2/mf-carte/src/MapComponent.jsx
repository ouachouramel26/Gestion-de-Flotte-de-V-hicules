import React from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import CarteLocalisation from './CarteLocalisation';

// Le module Leaflet s'accompagne d'import CSS global
import 'leaflet/dist/leaflet.css';

/**
 * Composant exposé via Module Federation
 * Reçoit le "token" en props depuis l'App Hôte
 */
export default function MapComponent({ token }) {
    const httpLink = createHttpLink({
        uri: 'http://localhost:4000/graphql',
    });

    const authLink = setContext((_, { headers }) => {
        return {
            headers: {
                ...headers,
                authorization: token ? `Bearer ${token}` : "",
            }
        }
    });

    const client = new ApolloClient({
        link: authLink.concat(httpLink),
        cache: new InMemoryCache()
    });

    return (
        <ApolloProvider client={client}>
            <div style={{ padding: '0', animation: 'fadeIn 0.5s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ color: '#10b981', fontSize: '2rem', marginBottom: '0.5rem', fontWeight:'800', marginTop:0 }}>📍 Monitoring Temps-Réel</h2>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Micro-Frontend React Distant (Apollo/GraphQL)</p>
                
                <div style={{
                    flex: 1, 
                    borderRadius: '16px', 
                    overflow: 'hidden', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.2)'
                }}>
                    <CarteLocalisation />
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .leaflet-popup-content-wrapper {
                    background: rgba(15, 23, 42, 0.9) !important;
                    backdrop-filter: blur(10px);
                    color: #f8fafc !important;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px !important;
                }
                .leaflet-popup-tip { background: rgba(15, 23, 42, 0.9) !important; }
            `}</style>
        </ApolloProvider>
    );
}
