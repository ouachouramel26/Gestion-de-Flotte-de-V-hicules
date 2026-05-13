import './commands';

afterEach(function() {
  // Prend une capture d'écran à la fin de chaque test pour le rapport technique
  cy.screenshot(`${this.currentTest.parent.title} -- ${this.currentTest.title}`, { overwrite: true });
});
