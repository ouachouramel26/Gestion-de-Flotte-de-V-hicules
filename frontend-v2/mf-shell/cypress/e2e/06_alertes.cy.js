describe('Centre de Notifications', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
    cy.get('[data-testid="nav-alertes"]').click();
    cy.get('.page-title').should('contain', 'Centre de Notifications');
  });

  it('affiche les filtres de base', () => {
    // Boutons de filtre (Mes alertes, Toutes, Non lues)
    cy.contains('button', 'Alertes Admin').should('be.visible');
    cy.contains('button', 'Toutes').should('be.visible');
    
    // Selects de niveau et type
    cy.get('select').should('have.length.at.least', 2);
    cy.get('select').first().should('contain', 'Tous niveaux');
  });

  it('affiche le bouton Tout lire s\'il y a des alertes non lues', () => {
    cy.get('.page-subtitle').then($subtitle => {
      const text = $subtitle.text();
      // On vérifie le nombre non lues
      const match = text.match(/(\d+) non lue/);
      if (match && parseInt(match[1]) > 0) {
        cy.contains('button', 'Tout lire').should('be.visible');
      }
    });
  });

  it('peut changer le mode de filtrage', () => {
    cy.contains('button', 'Toutes').click();
    // Le bouton 'Toutes' doit devenir bleu ou au moins être cliquable
    
    cy.contains('button', 'Non lues').click();
  });
});
