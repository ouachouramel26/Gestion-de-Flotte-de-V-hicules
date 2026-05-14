import React, { useState } from 'react';
import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web';
import Keycloak from 'keycloak-js';
import {
  LayoutDashboard, Car, Users, Wrench, MapPin, Bell,
  LogOut, ChevronRight, Truck, Shield, User, Settings,
  Menu, X
} from 'lucide-react';

// Pages
import DashboardPage from './pages/DashboardPage';
import VehiculesPage from './pages/VehiculesPage';
import ConducteursPage from './pages/ConducteursPage';
import MaintenancePage from './pages/MaintenancePage';
import AlertesPage from './pages/AlertesPage';
import LocalisationPage from './pages/LocalisationPage';
import TechniciensPage from './pages/TechniciensPage';

const keycloak = new Keycloak({
  url: "http://localhost:8180",
  realm: "sgfv",
  clientId: "sgfv_public"
});

// ---- RBAC : Définition des accès par rôle ----
const roleConfig = {
  admin: {
    label: 'Administrateur',
    color: '#dc2626',
    bg: '#fee2e2',
    icon: Shield,
    pages: ['dashboard', 'vehicules', 'conducteurs', 'techniciens', 'maintenance', 'localisation', 'alertes']
  },
  technicien: {
    label: 'Technicien',
    color: '#d97706',
    bg: '#fef3c7',
    icon: Wrench,
    pages: ['dashboard', 'maintenance', 'alertes']
  },
  conducteur: {
    label: 'Conducteur',
    color: '#2563eb',
    bg: '#dbeafe',
    icon: User,
    pages: ['dashboard', 'localisation', 'alertes']
  }
};

const allNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { section: 'GESTION', requiredPages: ['vehicules', 'conducteurs', 'maintenance'] },
  { key: 'vehicules', icon: Car, label: 'Véhicules' },
  { key: 'conducteurs', icon: Users, label: 'Conducteurs' },
  { key: 'techniciens', icon: Wrench, label: 'Techniciens' },
  { key: 'maintenance', icon: Wrench, label: 'Maintenance' },
  { section: 'MONITORING', requiredPages: ['localisation', 'alertes'] },
  { key: 'localisation', icon: MapPin, label: 'Localisation' },
  { key: 'alertes', icon: Bell, label: 'Alertes' },
];

/**
 * Extrait le rôle SGFV depuis le token Keycloak
 * Priorité : realm_access.roles → resource_access.sgfv_public.roles
 */
function getUserRole(kc) {
  const realmRoles = kc.tokenParsed?.realm_access?.roles || [];
  const clientRoles = kc.tokenParsed?.resource_access?.['sgfv_public']?.roles || [];
  const allRoles = [...realmRoles, ...clientRoles];

  if (allRoles.includes('admin')) return 'admin';
  if (allRoles.includes('technicien')) return 'technicien';
  if (allRoles.includes('conducteur')) return 'conducteur';
  // Par défaut, si aucun rôle SGFV trouvé → admin pour la démo
  return 'admin';
}

function MainLayout() {
  const { keycloak: kc, initialized } = useKeycloak();
  const [page, setPage] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  if (!initialized) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(37,99,235,0.3)'
          }}>
            <Truck size={32} color="white" />
          </div>
          <h2 style={{ color: '#1e293b', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>SGFV Fleet</h2>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Authentification Keycloak (SSO)...</p>
        </div>
      </div>
    );
  }

  if (!kc.authenticated) {
    kc.login();
    return null;
  }

  // ---- RBAC ----
  const userRole = getUserRole(kc);
  const config = roleConfig[userRole];
  const RoleIcon = config.icon;
  const allowedPages = config.pages;

  // Filtrer la navigation selon le rôle
  const navItems = allNavItems.filter(item => {
    if (item.section) {
      // Afficher la section seulement si au moins une de ses pages est autorisée
      return item.requiredPages?.some(p => allowedPages.includes(p));
    }
    return allowedPages.includes(item.key);
  });

  const givenName = kc.tokenParsed?.given_name || '';
  const familyName = kc.tokenParsed?.family_name || '';
  const fullName = `${givenName} ${familyName}`.trim();
  const userName = fullName || kc.tokenParsed?.preferred_username || kc.tokenParsed?.name || 'Utilisateur';
  const userEmail = kc.tokenParsed?.email || '';

  const renderPage = () => {
    // Protection RBAC côté frontend
    if (!allowedPages.includes(page)) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Shield size={64} color="#ef4444" style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h2 style={{ color: '#ef4444' }}>Accès non autorisé</h2>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Votre rôle ({config.label}) n'a pas accès à cette page.</p>
        </div>
      );
    }

    switch (page) {
      case 'vehicules': return <VehiculesPage />;
      case 'conducteurs': return <ConducteursPage userRole={userRole} />;
      case 'techniciens': return <TechniciensPage />;
      case 'maintenance': return <MaintenancePage userRole={userRole} />;
      case 'alertes': return <AlertesPage userRole={userRole} />;
      case 'localisation': return <LocalisationPage />;
      default: return <DashboardPage userRole={userRole} userName={userName} />;
    }
  };

  return (
    <div className={`layout ${isMenuOpen ? 'menu-open' : ''}`}>
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="brand" style={{ marginBottom: 0, padding: 0 }}>
          <div className="brand-icon" style={{ width: 32, height: 32, fontSize: '1rem' }}>
            <Truck size={16} />
          </div>
          <div className="brand-text" style={{ fontSize: '1rem' }}>SGFV</div>
        </div>
        <button className="burger-btn" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Overlay mobile */}
      {isMenuOpen && <div className="sidebar-overlay" onClick={closeMenu}></div>}

      <nav className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <Truck size={22} />
          </div>
          <div>
            <div className="brand-text">SGFV Fleet</div>
            <div className="brand-sub">Gestion de Flotte</div>
          </div>
        </div>

        {navItems.map((item, i) => {
          if (item.section) {
            return <div className="nav-section" key={i}>{item.section}</div>;
          }
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              data-testid={`nav-${item.key}`}
              className={`nav-link ${page === item.key ? 'active' : ''}`}
              onClick={() => {
                setPage(item.key);
                closeMenu();
              }}
            >
              <span className="icon"><Icon size={18} /></span>
              <span>{item.label}</span>
              {page === item.key && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.7 }} />}
            </button>
          );
        })}

        <div className="sidebar-footer">
          {/* Badge du rôle */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.35rem 0.75rem', borderRadius: '20px',
            background: config.bg, color: config.color,
            fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem'
          }}>
            <RoleIcon size={14} /> {config.label}
          </div>

          <div
            data-testid="user-name"
            style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}
          >
            {userName}
          </div>
          {userEmail && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              {userEmail}
            </div>
          )}

          <button
            data-testid="logout-btn"
            className="btn-logout"
            onClick={() => kc.logout()}
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </nav>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <ReactKeycloakProvider authClient={keycloak} initOptions={{ onLoad: 'login-required', checkLoginIframe: false }}>
      <MainLayout />
      <Toaster position="top-right" reverseOrder={false} />
    </ReactKeycloakProvider>
  );
}

export default App;
