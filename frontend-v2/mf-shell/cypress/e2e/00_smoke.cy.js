describe('Smoke Test - Intégrité globale', () => {
  it('charge l\'architecture de base sans plantage', () => {
    cy.login();
    cy.visit('/');
    // S'assure que le DOM principal (sidebar, contenu) charge bien
    cy.get('.layout').should('exist');
    cy.get('.sidebar').should('be.visible');
    cy.get('.main-content').should('be.visible');
  });
});
