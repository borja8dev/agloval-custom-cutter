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

const confirmOrder = () => {
  cy.contains('button', 'Confirmar pedido').should('be.enabled').click()
}

describe('Order history', () => {
  beforeEach(() => {
    cy.visitCalculator()
    cy.get('[data-testid="history-entry"]').should('not.exist')
  })

  it('starts empty', () => {
    cy.contains('Todavía no hay pedidos').should('be.visible')
    cy.contains('button', 'Vaciar historial').should('not.exist')
  })

  it('saves a confirmed order, empties the current one and lists it in the history', () => {
    buildOrder().then((total) => {
      confirmOrder()

      cy.get('[role="status"]').should('contain', 'Pedido #1 guardado')
      cy.get('[data-testid="order-line"]').should('not.exist')
      cy.get('[data-testid="order-total"]').should('contain', '0,00 EUR')
      cy.contains('button', 'Confirmar pedido').should('be.disabled')

      cy.get('[data-testid="history-entry"]')
        .should('have.length', 1)
        .first()
        .should('contain', 'Pedido #1')
        .and('contain', total)
    })
  })

  it('expands an entry to show the breakdown and collapses it again', () => {
    buildOrder().then((total) => {
      confirmOrder()
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
      confirmOrder()
      cy.get('[data-testid="order-line"]').should('not.exist')

      cy.contains('[data-testid="history-entry"]', 'Pedido #1').contains('button', 'Volver a pedir').click()
      cy.wait('@quote')

      cy.contains('Pedido #1 cargado en el pedido actual').should('be.visible')
      cy.get('[data-testid="order-line"]').should('have.length', 2)
      cy.get('input[aria-label="Cantidad de piezas 100 x 80 cm"]').should('have.value', '2')
      cy.get(`input[aria-label="Cantidad de ${SCREW}"]`).should('have.value', '4')
      cy.get('[data-testid="order-total"]').should('have.text', `Total: ${total}`)
      cy.get('[data-testid="history-entry"]').should('have.length', 1)
    })
  })

  it('never reuses an order number after deleting one', () => {
    buildOrder(1)
    confirmOrder()
    cy.get('[role="status"]').should('contain', 'Pedido #1 guardado')

    buildOrder(2)
    confirmOrder()
    cy.get('[role="status"]').should('contain', 'Pedido #2 guardado')
    cy.get('[data-testid="history-entry"]').should('have.length', 2)
    cy.get('[data-testid="history-entry"]').first().should('contain', 'Pedido #2')

    cy.get('button[aria-label="Eliminar pedido #2"]').click()
    cy.get('[data-testid="history-entry"]').should('have.length', 1).and('contain', 'Pedido #1')

    buildOrder(3)
    confirmOrder()
    cy.get('[role="status"]').should('contain', 'Pedido #3 guardado')
    cy.get('[data-testid="history-entry"]').then(($entries) => {
      expect($entries).to.have.length(2)
      expect($entries.eq(0).text()).to.contain('Pedido #3')
      expect($entries.eq(1).text()).to.contain('Pedido #1')
      expect($entries.text()).not.to.contain('Pedido #2')
    })
  })

  it('needs two clicks to clear the history', () => {
    buildOrder()
    confirmOrder()
    cy.get('[data-testid="history-entry"]').should('have.length', 1)

    cy.contains('button', 'Vaciar historial').click()
    cy.get('[data-testid="history-entry"]').should('have.length', 1)
    cy.contains('button', 'Cancelar').click()
    cy.get('[data-testid="history-entry"]').should('have.length', 1)

    cy.contains('button', 'Vaciar historial').click()
    cy.contains('button', 'Confirmar vaciado').click()
    cy.get('[data-testid="history-entry"]').should('not.exist')
    cy.contains('Todavía no hay pedidos').should('be.visible')
  })

  it('keeps the history after reloading the page', () => {
    buildOrder().then((total) => {
      confirmOrder()
      cy.get('[data-testid="history-entry"]').should('have.length', 1)

      cy.reload()

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
})
