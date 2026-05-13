describe('Consistance UI - Statuts et Badges', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
    cy.get('[data-testid="nav-vehicules"]').click();
  });

  it('affiche les statuts non modifiables comme des badges colorés', () => {
    cy.get('.data-table tbody tr').then($rows => {
      if ($rows.length > 0 && !$rows.eq(0).text().includes('Aucun véhicule')) {
        cy.get('.data-table tbody tr').first().within(() => {
          // Les badges utilisent la classe .badge
          cy.get('.badge').should('exist');
        });
      }
    });
  });

  it('propose un formulaire (select) pour changer d\'état via une action spécifique', () => {
    cy.get('.data-table tbody tr').then($rows => {
      if ($rows.length > 0 && !$rows.eq(0).text().includes('Aucun véhicule')) {
        // Le bouton de changement d'état
        cy.get('button[title="Changer statut"]').first().click();
        
        cy.get('.modal').should('be.visible');
        // Un select doit être présent pour choisir le nouveau statut
        cy.get('.modal select').should('exist');
        
        cy.contains('button', 'Annuler').click();
      }
    });
  });
});
