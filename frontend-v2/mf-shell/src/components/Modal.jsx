import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal - Composant générique accessible.
 * @param {boolean} isOpen - État d'ouverture
 * @param {Function} onClose - Fonction de fermeture
 * @param {string} title - Titre de la modal
 * @param {React.ReactNode} children - Contenu
 */
const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Empêcher le scroll du fond
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="modal-overlay">
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        data-testid="modal-content"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
