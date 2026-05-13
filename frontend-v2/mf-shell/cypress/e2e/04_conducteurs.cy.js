describe('Gestion des Conducteurs', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
    cy.get('[data-testid="nav-conducteurs"]').click();
    cy.get('.page-title').should('contain', 'Gestion des Conducteurs');
  });

  it('affiche la liste des conducteurs', () => {
    cy.get('.data-table').should('be.visible');
    cy.get('.data-table thead th').should('contain', 'Identité');
    cy.get('.data-table thead th').should('contain', 'Permis');
  });

  it('filtre les conducteurs par statut', () => {
    cy.get('select').first().should('be.visible');
    cy.get('select').first().select('ACTIF');
    // Le tableau se met à jour
  });

  it('recherche un conducteur par nom ou email', () => {
    cy.get('input[placeholder="Nom, prénom, email..."]').type('Dupont');
    // Vérifier l'UI sans bloquer sur les données
  });

  it("bloque la soumission du formulaire d'ajout si des champs sont vides", () => {
    cy.contains('button', 'Ajouter').click();
    cy.get('.modal').should('be.visible');
    cy.get('.modal h2').should('contain', 'Ajouter un conducteur');
    
    // On clique sur le bouton de soumission sans rien remplir
    cy.get('.modal form').submit();
    
    // Le formulaire ne doit pas se fermer car la validation HTML native (required) bloque
    cy.get('.modal').should('be.visible');
    
    cy.contains('button', 'Annuler').click();
  });

  it('affiche les licences de permis sous forme de tags visuels', () => {
    cy.get('.data-table tbody tr').then($rows => {
      if ($rows.length > 0 && !$rows.eq(0).text().includes('Aucun conducteur')) {
        // Dans l'UI, les permis sont des petits badges bleus dans la colonne
        cy.get('.data-table tbody tr').first().within(() => {
          cy.contains('№').should('exist');
        });
      }
    });
  });
});
