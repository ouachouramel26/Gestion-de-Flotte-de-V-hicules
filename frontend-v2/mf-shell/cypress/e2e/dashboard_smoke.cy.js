describe('SGFV Dashboard Smoke Test', () => {
  beforeEach(() => {
    // Dans un environnement réel, on configurerait Keycloak pour outrepasser le login ici
    cy.visit('http://localhost:3000');
  });

  it('devrait charger le Dashboard avec succès', () => {
    // Vérifie le titre principal
    cy.contains('h1', 'Tableau de Bord').should('be.visible');
    
    // Vérifie la présence des cartes de statistiques
    cy.get('.card').should('have.length.at.least', 3);
    cy.contains('Total Véhicules').should('be.visible');
  });

  it('devrait permettre de naviguer vers la page Véhicules', () => {
    cy.get('nav').contains('Véhicules').click();
    cy.url().should('include', '/vehicules');
    cy.contains('Inventaire de la Flotte').should('be.visible');
  });

  it('devrait charger la carte de géolocalisation', () => {
    cy.get('nav').contains('Localisation').click();
    cy.url().should('include', '/localisation');
    // Vérifie que le micro-frontend distant se charge (Suspense fallback ou carte)
    cy.contains('Géo-Localisation').should('be.visible');
  });
});
