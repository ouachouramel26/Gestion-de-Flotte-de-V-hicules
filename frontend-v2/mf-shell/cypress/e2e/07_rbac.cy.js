describe('RBAC & Composants Transverses', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  it('gère l\'accès restreint aux routes (simulation)', () => {
    // Vérifie qu'on est redirigé ou que le contenu de base s'affiche
    cy.get('.layout').should('exist');
    
    // Le dashboard doit être accessible par défaut
    cy.get('[data-testid="nav-dashboard"]').should('be.visible');
  });

  it('ferme les modales avec le bouton Annuler', () => {
    cy.get('[data-testid="nav-vehicules"]').click();
    cy.contains('button', 'Nouveau').click();
    
    // Vérifie l'ouverture
    cy.get('.modal').should('be.visible');
    
    // Fermeture propre
    cy.contains('button', 'Annuler').click();
    cy.get('.modal').should('not.exist');
  });
});
