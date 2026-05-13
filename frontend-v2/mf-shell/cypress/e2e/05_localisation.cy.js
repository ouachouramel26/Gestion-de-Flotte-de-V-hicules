describe('Géo-Localisation', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
    cy.get('[data-testid="nav-localisation"]').click();
    cy.get('.page-title').should('contain', 'Géo-Localisation');
  });

  it('affiche la carte de géolocalisation', () => {
    // La carte est rendue via leaflet, donc il doit y avoir la classe .leaflet-container
    cy.get('.leaflet-container').should('be.visible');
  });

  it('bascule entre les onglets Véhicules et Zones', () => {
    cy.contains('button', 'Zones').click();
    cy.contains('button', 'Véhicules').click();
  });

  it('affiche le mode historique', () => {
    cy.contains('button', 'Historique').click();
    // Le panneau historique doit s'afficher avec le bouton "Tracer"
    cy.contains('button', 'Tracer').should('be.visible');
  });

  it("ouvre l'outil pour placer une zone", () => {
    cy.contains('button', 'Placer Zone').click();
    // Vérifie le changement de texte du bouton
    cy.contains('button', 'Annuler').should('be.visible');
    // Vérifie le tooltip instructif
    cy.contains('Cliquez sur la carte').should('be.visible');
    
    // Annuler
    cy.contains('button', 'Annuler').click();
  });
});
