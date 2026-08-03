describe('Calculation History', () => {
  beforeEach(() => {
    cy.clearLocalStorage();

    cy.visit('/');
    cy.intercept('GET', '**/api/products*').as('getProducts');
    cy.intercept('POST', '**/api/calculations').as('createCalculation');
  });

  const performCalculation = () => {
    cy.selectProduct(0);
    cy.addPiece(100, 100);
    cy.get('[data-testid="calculate-btn"]').click();
    cy.wait('@createCalculation');
  };

  it('should save calculation to history and show a confirmation', () => {
    cy.wait('@getProducts');

    performCalculation();

    cy.contains('Cálculo guardado').should('be.visible');
  });

  it('should update the history count in the header toggle', () => {
    cy.wait('@getProducts');

    cy.contains('button', 'Historial (0)').should('be.visible');

    performCalculation();

    cy.contains('button', 'Historial (1)').should('be.visible');
  });

  it('should show history view when clicked', () => {
    cy.wait('@getProducts');

    performCalculation();

    cy.contains('button', /Historial/).click();

    cy.contains('Histórico de cálculos').should('be.visible');
    cy.get('[data-testid^="history-item-"]').should('have.length.greaterThan', 0);
  });

  it('should delete from history', () => {
    cy.wait('@getProducts');

    performCalculation();
    cy.get('button').contains('Limpiar').click();
    performCalculation();

    cy.contains('button', /Historial/).click();
    cy.get('[data-testid^="history-item-"]').should('have.length', 2);

    cy.get('[data-testid^="history-item-"]')
      .first()
      .find('[title="Eliminar"]')
      .click();

    cy.get('[data-testid^="history-item-"]').should('have.length', 1);
  });
});
