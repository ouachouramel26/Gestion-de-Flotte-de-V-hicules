Cypress.Commands.add('login', (username = 'admin', password = 'admin123') => {
  cy.session(
    [username, password],
    () => {
      cy.visit('/');
      cy.origin('http://localhost:8180', { args: { username, password } }, ({ username, password }) => {
        cy.get('#username', { timeout: 10000 }).should('be.visible').clear().type(username);
        cy.get('#password').clear().type(password, { log: false });
        cy.get('#kc-login').click();
      });
      // Attendre de revenir sur l'application React
      cy.url({ timeout: 10000 }).should('include', 'localhost:3005');
      cy.get('.layout', { timeout: 10000 }).should('exist');
    },
    {
      cacheAcrossSpecs: true
    }
  );
});

Cypress.Commands.add('getBySel', (selector, ...args) => {
  return cy.get(`[data-testid=${selector}]`, ...args);
});
