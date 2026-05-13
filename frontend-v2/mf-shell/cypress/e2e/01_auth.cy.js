describe('Authentification & Navigation', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  it('affiche la sidebar avec les liens de navigation', () => {
    cy.get('nav.sidebar').should('be.visible');
    cy.get('[data-testid="nav-dashboard"]').should('exist');
    cy.get('[data-testid="nav-vehicules"]').should('exist');
    cy.get('[data-testid="nav-conducteurs"]').should('exist');
    cy.get('[data-testid="nav-maintenance"]').should('exist');
    cy.get('[data-testid="nav-localisation"]').should('exist');
    cy.get('[data-testid="nav-alertes"]').should('exist');
  });

  // J'ai adapté ce test car dans vos pages, l'utilisateur est affiché dans le footer de la sidebar, pas dans une topbar !
  it("affiche le nom d'utilisateur dans la sidebar (pas de topbar dans votre app)", () => {
    cy.get('.sidebar-footer').should('be.visible');
    // On vérifie que le nom d'utilisateur est bien là
    cy.get('.sidebar-footer').invoke('text').should('match', /Utilisateur|Admin/i); 
  });

  it('affiche le bouton Déconnexion dans la sidebar', () => {
    cy.get('.btn-logout').should('be.visible').and('contain', 'Déconnexion');
  });

  it('navigue vers la page Dashboard par défaut', () => {
    cy.visit('/');
    // Sur votre page Dashboard, il n'y a pas de ".page-title", mais un "<h1>Bonjour, ..."
    cy.get('h1').should('contain', 'Bonjour');
  });

  it('navigue vers /vehicules au clic', () => {
    cy.get('[data-testid="nav-vehicules"]').click();
    cy.get('.page-title').should('contain', 'Parc Automobile');
  });

  it('navigue vers /conducteurs au clic', () => {
    cy.get('[data-testid="nav-conducteurs"]').click();
    cy.get('.page-title').should('contain', 'Gestion des Conducteurs');
  });

  it('navigue vers /localisation au clic', () => {
    cy.get('[data-testid="nav-localisation"]').click();
    cy.get('.page-title').should('contain', 'Géo-Localisation');
  });

  it('navigue vers /maintenance au clic', () => {
    cy.get('[data-testid="nav-maintenance"]').click();
    cy.get('.page-title').should('contain', 'Maintenance');
  });
});
