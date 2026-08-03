declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      selectProduct(index?: number): Chainable<JQuery<HTMLElement>>;
      addPiece(width: number, height: number): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add('selectProduct', (index: number = 0) => {
  return cy.get('[data-testid="product-card"]').eq(index).click();
});

Cypress.Commands.add('addPiece', (width: number, height: number) => {
  cy.get('[data-testid="width-input"]').clear().type(String(width));
  cy.get('[data-testid="height-input"]').clear().type(String(height));
  return cy.get('[data-testid="add-piece-btn"]').click();
});

export {};
