describe('Cutting Calculator - Complete Workflow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('GET', '**/api/products*').as('getProducts');
    cy.intercept('POST', '**/api/calculations').as('createCalculation');
  });

  it('should complete full calculation workflow using real backend values', () => {
    cy.wait('@getProducts');

    cy.selectProduct(0);
    cy.get('[data-testid="product-card"]').first().should('contain', 'Seleccionado');

    cy.addPiece(100, 80);
    cy.get('[data-testid="piece-item-0"]').should('contain', '100 × 80 cm');

    cy.addPiece(100, 80);
    cy.addPiece(120, 90);
    cy.get('[data-testid^="piece-item-"]').should('have.length', 3);

    cy.get('[data-testid="calculate-btn"]').click();

    cy.wait('@createCalculation').then((interception) => {
      const data = interception.response?.body?.data;
      expect(data, 'calculation response body').to.exist;

      cy.contains('Resultado del cálculo').should('be.visible');
      cy.contains(`€${data.pricing.totalPrice.toFixed(2)}`).should('be.visible');
      cy.contains(data.calculation.boardsNeeded.toFixed(1)).should('be.visible');
      cy.contains(`${data.calculation.totalAreaNeeded.toFixed(2)} m²`).should('be.visible');
    });

    cy.get('button').contains('Limpiar').click();
    cy.get('[data-testid^="piece-item-"]').should('not.exist');
  });

  it('should show price correctly for a single piece', () => {
    cy.wait('@getProducts');
    cy.selectProduct(0);

    cy.addPiece(150, 80);

    cy.get('[data-testid="calculate-btn"]').click();
    cy.wait('@createCalculation');

    cy.contains('€').should('be.visible');
    cy.contains('Presupuesto válido').should('be.visible');
  });

  it('should prevent calculation with no product selected', () => {
    cy.wait('@getProducts');

    cy.addPiece(100, 100);

    cy.get('[data-testid="calculate-btn"]').should('not.exist');
  });

  it('should prevent calculation with no pieces', () => {
    cy.wait('@getProducts');
    cy.selectProduct(0);

    cy.get('[data-testid="calculate-btn"]').should('not.exist');
  });

  it('should surface the real backend error message on a failed calculation', () => {
    cy.wait('@getProducts');

    cy.intercept('POST', '**/api/calculations', {
      statusCode: 400,
      body: {
        success: false,
        error: { code: 'INVALID_PIECE', message: 'Invalid piece dimensions' },
        timestamp: new Date().toISOString()
      }
    }).as('calculationError');

    cy.selectProduct(0);
    cy.addPiece(500, 100);

    cy.get('[data-testid="calculate-btn"]').click();
    cy.wait('@calculationError');

    cy.contains('Invalid piece dimensions').should('be.visible');
  });
});
