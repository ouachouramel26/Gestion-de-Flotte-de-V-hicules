import React from 'react';

/**
 * StatusBadge - Composant réutilisable pour afficher les statuts avec le bon code couleur.
 * @param {string} status - Le code du statut (ex: 'EN_MISSION', 'DISPONIBLE')
 * @returns {JSX.Element}
 */
const StatusBadge = ({ status }) => {
  const getBadgeClass = (s) => {
    if (!s) return 'badge-gray';
    const statusUpper = s.toUpperCase();
    
    // Correspondance avec les classes de App.css
    if (statusUpper === 'DISPONIBLE' || statusUpper === 'EN_SERVICE' || statusUpper === 'ACTIF' || statusUpper === 'TERMINEE') {
      return 'badge-success';
    }
    if (statusUpper === 'EN_MISSION' || statusUpper === 'PLANIFIEE' || statusUpper === 'EN_COURS' || statusUpper === 'MISSION') {
      return 'badge-info';
    }
    if (statusUpper === 'EN_MAINTENANCE' || statusUpper === 'ATTENTE' || statusUpper === 'AVERTISSEMENT') {
      return 'badge-warning';
    }
    if (statusUpper === 'EN_PANNE' || statusUpper === 'HORS_SERVICE' || statusUpper === 'INACTIF' || statusUpper === 'ANNULEE' || statusUpper === 'CRITIQUE') {
      return 'badge-danger';
    }
    
    return 'badge-info'; // Défaut
  };

  const formatLabel = (s) => {
    if (!s) return 'Inconnu';
    return s.replace(/_/g, ' ').charAt(0) + s.replace(/_/g, ' ').slice(1).toLowerCase();
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      {formatLabel(status)}
    </span>
  );
};

export default StatusBadge;
