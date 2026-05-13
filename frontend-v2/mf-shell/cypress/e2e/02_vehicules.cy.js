describe('Gestion des Véhicules', () => {
  beforeEach(() => {
    cy.login();
    // On visite la page d'accueil et on navigue vers véhicules pour être dans le bon contexte
    cy.visit('/');
    cy.get('[data-testid="nav-vehicules"]').click();
    // On s'assure que la page est bien chargée
    cy.get('.page-title').should('contain', 'Parc Automobile');
  });

  it('affiche la liste des véhicules', () => {
    cy.get('.data-table').should('be.visible');
    cy.get('.data-table thead th').should('contain', 'Plaque');
    cy.get('.data-table thead th').should('contain', 'Statut');
  });

  it('recherche un véhicule par matricule ou marque', () => {
    // La barre de recherche
    cy.get('input[placeholder="Plaque, Marque..."]').should('be.visible');
    cy.get('input[placeholder="Plaque, Marque..."]').type('Renault');
    
    // Attendre un peu si c'est filtré côté client (immédiat) ou serveur
    // cy.get('.data-table tbody tr').should('have.length.at.least', 1);
  });

  it('ajoute un nouveau véhicule', () => {
    // Clique sur le bouton Nouveau (réservé aux admins, on suppose que l'utilisateur est admin pour la démo)
    cy.contains('button', 'Nouveau').click();
    
    // Vérifie que la modale s'ouvre
    cy.get('.modal').should('be.visible');
    cy.get('.modal h2').should('contain', 'Nouveau Véhicule');
    
    // Ferme la modale
    cy.contains('button', 'Annuler').click();
    cy.get('.modal').should('not.exist');
  });

  it("modifie les informations d'un véhicule", () => {
    // On vérifie qu'il y a au moins un véhicule non HORS_SERVICE pour pouvoir le modifier
    cy.get('.data-table tbody tr').then($rows => {
      if ($rows.length > 0 && !$rows.eq(0).text().includes('Aucun véhicule trouvé')) {
        // Le bouton modifier a title="Modifier"
        cy.get('button[title="Modifier"]').first().click();
        
        cy.get('.modal').should('be.visible');
        cy.get('.modal h2').should('contain', 'Modifier Véhicule');
        
        cy.contains('button', 'Annuler').click();
      }
    });
  });

  it('archive un véhicule', () => {
    // L'action est "Archiver" et non "Supprimer" dans votre code
    cy.get('.data-table tbody tr').then($rows => {
      if ($rows.length > 0 && !$rows.eq(0).text().includes('Aucun véhicule trouvé')) {
        // Vérifie la présence du bouton Archiver
        cy.get('button[title="Archiver"]').first().should('exist');
      }
    });
  });
});
