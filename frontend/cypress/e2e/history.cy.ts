import { TEST_CUSTOMER } from '../support/customer'
import { formatCents, groupPriceCents } from '../support/money'

const SUPERPAN = 'SUPERPAN WHITE SR209 SM 10mm 285x210'
const SCREW = 'TORNILLO SPAX 3,5 X 20'

// Builds an order with one board piece and some screws, and yields its total text.
const buildOrder = (screws = 3) => {
  cy.pickProduct(SUPERPAN)
  cy.addBoardPiece(100, 80, 2)
  cy.pickProduct(SCREW)
  cy.addQuantity(screws)
  cy.get('[data-testid="quote-group"]').should('have.length', 2)
  return cy
    .get('[data-testid="order-total"]')
    .should('not.contain', '--')
    .invoke('text')
    .then((text) => text.replace('Total: ', ''))
}

describe('Order history', () => {
  beforeEach(() => {
    cy.visitCalculator()
    cy.get('[data-testid="history-entry"]').should('not.exist')
  })

  it('starts empty', () => {
    cy.contains('header button', 'Historial (0)').should('be.visible')
    cy.openHistory()
    cy.contains('Todavía no hay pedidos').should('be.visible')
    cy.contains('button', 'Vaciar historial').should('not.exist')
  })

  it('saves a confirmed order, empties the current one and lists it in the history', () => {
    buildOrder().then((total) => {
      cy.confirmOrder()

      cy.get('[role="status"]')
        .should('contain', 'Pedido nº 1 enviado')
        .and('contain', TEST_CUSTOMER.email)
      cy.get('header').should('contain', 'Hola, Prueba')
      cy.get('[data-testid="order-line"]').should('not.exist')
      cy.get('[data-testid="order-total"]').should('contain', '0,00 EUR')
      cy.contains('button', 'Confirmar pedido').should('be.disabled')

      cy.contains('header button', 'Historial (1)').should('be.visible')
      cy.openHistory()
      cy.get('[data-testid="history-entry"]')
        .should('have.length', 1)
        .first()
        .should('contain', 'Pedido #1')
        .and('contain', total)
    })
  })

  it('expands an entry to show the breakdown and collapses it again', () => {
    buildOrder().then((total) => {
      cy.confirmOrder()
      cy.openHistory()
      const entry = () => cy.get('[data-testid="history-entry"]').first()

      entry().find('[data-testid="quote-group"]').should('not.exist')
      entry().find('button[aria-expanded]').click()
      entry().find('[data-testid="quote-group"]').should('have.length', 2)
      entry().find('[data-testid="quote-group"]').then(($groups) => {
        const sum = [...$groups].reduce((acc, g) => acc + groupPriceCents(g.textContent ?? ''), 0)
        expect(`${formatCents(sum)} EUR`).to.equal(total)
      })

      entry().find('button[aria-expanded]').click()
      entry().find('[data-testid="quote-group"]').should('not.exist')
    })
  })

  it('reloads the lines and the total with "Volver a pedir"', () => {
    buildOrder(4).then((total) => {
      cy.confirmOrder()
      cy.get('[data-testid="order-line"]').should('not.exist')

      cy.openHistory()
      cy.contains('[data-testid="history-entry"]', 'Pedido #1').contains('button', 'Volver a pedir').click()
      cy.wait('@quote')

      cy.get('[role="dialog"]').should('not.exist')
      cy.contains('section', '3. Pedido actual')
        .find('[role="status"]')
        .should('be.visible')
        .and('contain', 'Pedido #1 cargado en el pedido actual')
      cy.get('[data-testid="order-line"]').should('have.length', 2)
      cy.get('input[aria-label="Cantidad de piezas 100 x 80 cm"]').should('have.value', '2')
      cy.get(`input[aria-label="Cantidad de ${SCREW}"]`).should('have.value', '4')
      cy.get('[data-testid="order-total"]').should('have.text', `Total: ${total}`)
      cy.openHistory()
      cy.get('[data-testid="history-entry"]').should('have.length', 1)
    })
  })

  it('never reuses an order number after deleting one', () => {
    buildOrder(1)
    cy.confirmOrder()
    cy.get('[role="status"]').should('contain', 'Pedido nº 1 enviado')

    buildOrder(2)
    cy.confirmOrder()
    cy.get('[role="status"]').should('contain', 'Pedido nº 2 enviado')
    cy.openHistory()
    cy.get('[data-testid="history-entry"]').should('have.length', 2)
    cy.get('[data-testid="history-entry"]').first().should('contain', 'Pedido #2')

    cy.get('button[aria-label="Eliminar pedido #2"]').click()
    cy.get('[data-testid="history-entry"]').should('have.length', 1).and('contain', 'Pedido #1')
    cy.closeHistory()

    buildOrder(3)
    cy.confirmOrder()
    cy.get('[role="status"]').should('contain', 'Pedido nº 3 enviado')
    cy.openHistory()
    cy.get('[data-testid="history-entry"]').then(($entries) => {
      expect($entries).to.have.length(2)
      expect($entries.eq(0).text()).to.contain('Pedido #3')
      expect($entries.eq(1).text()).to.contain('Pedido #1')
      expect($entries.text()).not.to.contain('Pedido #2')
    })
  })

  it('needs two clicks to clear the history', () => {
    buildOrder()
    cy.confirmOrder()
    cy.openHistory()
    cy.get('[data-testid="history-entry"]').should('have.length', 1)

    cy.contains('button', 'Vaciar historial').click()
    cy.get('[data-testid="history-entry"]').should('have.length', 1)
    cy.contains('button', 'Cancelar').click()
    cy.get('[data-testid="history-entry"]').should('have.length', 1)

    cy.contains('button', 'Vaciar historial').click()
    cy.contains('button', 'Confirmar vaciado').click()
    cy.get('[data-testid="history-entry"]').should('not.exist')
    cy.contains('Todavía no hay pedidos').should('be.visible')
    cy.closeHistory()
    cy.contains('header button', 'Historial (0)').should('be.visible')
  })

  it('keeps the history after reloading the page', () => {
    buildOrder().then((total) => {
      cy.confirmOrder()
      cy.contains('header button', 'Historial (1)').should('be.visible')

      cy.reload()

      cy.openHistory()
      cy.get('[data-testid="history-entry"]')
        .should('have.length', 1)
        .first()
        .should('contain', 'Pedido #1')
        .and('contain', total)
      cy.window().then((win) => {
        expect(win.localStorage.getItem('agloval_order_history_v2')).to.be.a('string')
      })
    })
  })

  it('closes the history window with Escape and returns the focus to its button', () => {
    cy.openHistory()
    cy.focused().closest('[role="dialog"]').should('exist')
    cy.get('body').type('{esc}')
    cy.get('[role="dialog"]').should('not.exist')
    cy.focused().should('contain', 'Historial (0)')
  })
})
