describe('Dashboard & KPIs', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
    // Assure qu'on est bien sur le dashboard
    cy.get('h1').should('contain', 'Bonjour');
  });

  it('affiche les agrégats métier (KPIs)', () => {
    // Vérifie la présence des cartes KPI principales
    cy.contains('Véhicules').should('be.visible');
    cy.contains('Alertes').should('be.visible');
    
    // Vérifie qu'il y a des valeurs numériques affichées (les KPI)
    cy.get('.stat-card').should('have.length.at.least', 1);
  });
});
