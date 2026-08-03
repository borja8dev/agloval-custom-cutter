describe('Product Selection', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('GET', '**/api/products*').as('getProducts');
  });

  it('should load and display products', () => {
    cy.wait('@getProducts');

    cy.get('[data-testid="product-card"]').should('have.length.greaterThan', 0);
  });

  it('should select product with click', () => {
    cy.wait('@getProducts');

    cy.selectProduct(0);

    cy.get('[data-testid="product-card"]').first().should('contain', 'Seleccionado');
    cy.get('[data-testid="product-card"]').first().should('have.class', 'bg-blue-50');
  });

  it('should allow switching product selection', () => {
    cy.wait('@getProducts');

    cy.selectProduct(0);
    cy.get('[data-testid="product-card"]').first().should('contain', 'Seleccionado');

    cy.selectProduct(1);
    cy.get('[data-testid="product-card"]').eq(1).should('contain', 'Seleccionado');
    cy.get('[data-testid="product-card"]').first().should('not.contain', 'Seleccionado');
  });

  it('should display product details', () => {
    cy.wait('@getProducts');

    const card = cy.get('[data-testid="product-card"]').first();

    card.should('contain', 'cm');
    card.should('contain', 'mm');
    card.should('contain', '€');
  });
});
