import { parseCents } from './money'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Clears localStorage, registers the API intercepts and loads the page. */
      visitCalculator(): Chainable<void>
      /** Selects a family by code and waits for the product list to reload. */
      selectFamily(code: string): Chainable<void>
      /** Searches by name and selects the product whose row contains the text. */
      pickProduct(text: string): Chainable<void>
      /** Fills the board form without submitting it. */
      fillBoardPiece(width: number | string, height: number | string, quantity?: number | string): Chainable<void>
      /** Adds a piece to the order and waits for the new quote. */
      addBoardPiece(width: number, height: number, quantity?: number): Chainable<void>
      /** Adds a quantity of a UD or ML product and waits for the new quote. */
      addQuantity(quantity: number): Chainable<void>
      /** Yields the order total in integer cents. */
      orderTotal(): Chainable<number>
    }
  }
}

Cypress.Commands.add('visitCalculator', () => {
  cy.intercept('POST', '**/api/orders/quote').as('quote')
  cy.intercept('GET', '**/api/families*').as('families')
  cy.intercept({ method: 'GET', pathname: /^\/api\/products(\/search)?$/ }).as('products')
  cy.clearLocalStorage()
  cy.visit('/')
  cy.wait('@families')
  cy.wait('@products')
})

Cypress.Commands.add('selectFamily', (code: string) => {
  cy.get('[data-testid="family-select"]').select(code)
  cy.wait('@products')
})

Cypress.Commands.add('pickProduct', (text: string) => {
  cy.get('[data-testid="product-search"]').then(($input) => {
    // The same query triggers no new request, so only search when the text changes.
    if ($input.val() !== text) {
      cy.wrap($input).clear()
      cy.wrap($input).type(text)
      cy.wait('@products')
    }
  })
  cy.contains('[data-testid="product-item"]', text).click()
  cy.contains('[data-testid="product-item"]', text).should('have.attr', 'aria-selected', 'true')
})

Cypress.Commands.add(
  'fillBoardPiece',
  (width: number | string, height: number | string, quantity: number | string = 1) => {
    cy.get('[data-testid="width-input"]').clear()
    cy.get('[data-testid="width-input"]').type(String(width))
    cy.get('[data-testid="height-input"]').clear()
    cy.get('[data-testid="height-input"]').type(String(height))
    cy.get('[data-testid="quantity-input"]').clear()
    cy.get('[data-testid="quantity-input"]').type(String(quantity))
  }
)

Cypress.Commands.add('addBoardPiece', (width: number, height: number, quantity: number = 1) => {
  cy.fillBoardPiece(width, height, quantity)
  cy.get('[data-testid="add-piece-btn"]').click()
  cy.wait('@quote')
})

Cypress.Commands.add('addQuantity', (quantity: number) => {
  cy.get('[data-testid="quantity-input"]').clear()
  cy.get('[data-testid="quantity-input"]').type(String(quantity))
  cy.get('[data-testid="add-line-btn"]').click()
  cy.wait('@quote')
})

Cypress.Commands.add('orderTotal', () =>
  cy
    .get('[data-testid="order-total"]')
    .should('not.contain', '--')
    .invoke('text')
    .then((text) => parseCents(text))
)

export {}
