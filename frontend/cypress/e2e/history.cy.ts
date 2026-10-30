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

const searchBox = () => cy.get('input[type="search"]')

describe('History pages', () => {
  beforeEach(() => {
    cy.visitCalculator()
  })

  it('links both histories from the header, opening in a new tab', () => {
    cy.get('header nav[aria-label="Historiales"]').within(() => {
      cy.contains('a', 'Presupuestos')
        .should('have.attr', 'href', '/presupuestos')
        .and('have.attr', 'target', '_blank')
      cy.contains('a', 'Pedidos')
        .should('have.attr', 'href', '/pedidos')
        .and('have.attr', 'target', '_blank')
    })
    cy.contains('header button', /Historial/).should('not.exist')
  })

  it('starts empty, with a link back to the order manager', () => {
    cy.openHistory('order')
    cy.title().should('eq', 'Historial de pedidos · Agloval')
    cy.get('header nav a[aria-current="page"]').should('have.text', 'Pedidos')
    cy.contains('Todavía no hay pedidos').should('be.visible')
    cy.contains('button', 'Vaciar historial').should('not.exist')
    cy.contains('a', 'Ir al gestor de pedidos').should('have.attr', 'href', '/')

    cy.openHistory('quote')
    cy.title().should('eq', 'Historial de presupuestos · Agloval')
    cy.contains('Todavía no hay presupuestos').should('be.visible')
  })

  it('saves a confirmed order and lists it on the orders page', () => {
    buildOrder().then((total) => {
      cy.confirmSubmission()

      cy.get('[role="status"]')
        .should('contain', 'Pedido nº 1 enviado')
        .and('contain', TEST_CUSTOMER.email)
      cy.get('header').should('contain', 'Hola, Prueba')
      cy.get('[data-testid="order-line"]').should('not.exist')

      cy.openHistory()
      cy.get('header').should('contain', 'Hola, Prueba')
      cy.contains('[aria-live="polite"]', '1 pedido').should('exist')
      cy.get('[data-testid="history-entry"]')
        .should('have.length', 1)
        .first()
        .should('contain', 'Pedido nº 1')
        .and('contain', TEST_CUSTOMER.name)
        .and('contain', total)
    })
  })

  it('expands an entry to show the breakdown and collapses it again', () => {
    buildOrder().then((total) => {
      cy.confirmSubmission()
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

  it('searches by number and customer name, ignoring case and accents', () => {
    buildOrder(1)
    cy.confirmSubmission()
    buildOrder(2)
    cy.confirmSubmission()

    cy.openHistory()
    cy.get('[data-testid="history-entry"]').should('have.length', 2)
    cy.contains('[aria-live="polite"]', '2 pedidos').should('exist')

    searchBox().type('2')
    cy.get('[data-testid="history-entry"]').should('have.length', 1).and('contain', 'Pedido nº 2')
    cy.contains('[aria-live="polite"]', '1 pedido').should('exist')

    searchBox().clear()
    searchBox().type(TEST_CUSTOMER.name.toUpperCase())
    cy.get('[data-testid="history-entry"]').should('have.length', 2)

    searchBox().clear()
    searchBox().type('no existe nadie')
    cy.get('[data-testid="history-entry"]').should('not.exist')
    cy.contains('[aria-live="polite"]', 'Sin resultados').should('exist')
  })

  it('reloads the lines and the total with "Repetir"', () => {
    buildOrder(4).then((total) => {
      cy.confirmSubmission()

      cy.openHistory()
      cy.contains('[data-testid="history-entry"]', 'Pedido nº 1').contains('button', 'Repetir').click()
      cy.location('pathname').should('eq', '/')
      cy.wait('@quote')

      cy.contains('section', 'Pedido actual')
        .find('[role="status"]')
        .should('be.visible')
        .and('contain', 'Pedido #1 cargado en el pedido actual')
      cy.get('[data-testid="order-line"]').should('have.length', 2)
      cy.get('input[aria-label="Cantidad de piezas 100 x 80 cm"]').should('have.value', '2')
      cy.get(`input[aria-label="Cantidad de ${SCREW}"]`).should('have.value', '4')
      cy.get('[data-testid="order-total"]').should('have.text', `Total: ${total}`)
    })
  })

  it('never reuses an order number after deleting one', () => {
    buildOrder(1)
    cy.confirmSubmission()
    buildOrder(2)
    cy.confirmSubmission()
    cy.openHistory()
    cy.get('[data-testid="history-entry"]').should('have.length', 2)
    cy.get('[data-testid="history-entry"]').first().should('contain', 'Pedido nº 2')

    cy.get('button[aria-label="Eliminar pedido nº 2"]').click()
    cy.get('[data-testid="history-entry"]').should('have.length', 1).and('contain', 'Pedido nº 1')
    cy.closeHistory()

    buildOrder(3)
    cy.confirmSubmission()
    cy.get('[role="status"]').should('contain', 'Pedido nº 3 enviado')
    cy.openHistory()
    cy.get('[data-testid="history-entry"]').then(($entries) => {
      expect($entries).to.have.length(2)
      expect($entries.eq(0).text()).to.contain('Pedido nº 3')
      expect($entries.eq(1).text()).to.contain('Pedido nº 1')
      expect($entries.text()).not.to.contain('Pedido nº 2')
    })
  })

  it('needs two clicks to clear the history', () => {
    buildOrder()
    cy.confirmSubmission()
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
  })

  it('keeps the history after reloading the page', () => {
    buildOrder().then((total) => {
      cy.confirmSubmission()
      cy.openHistory()

      cy.reload()

      cy.get('[data-testid="history-entry"]')
        .should('have.length', 1)
        .first()
        .should('contain', 'Pedido nº 1')
        .and('contain', total)
      cy.window().then((win) => {
        expect(win.localStorage.getItem('agloval_order_history_v3')).to.be.a('string')
      })
    })
  })

  it('saves a quote apart from the orders and turns it into an order', () => {
    buildOrder().then((total) => {
      cy.confirmSubmission('quote')
      cy.get('[role="status"]')
        .should('contain', 'Presupuesto nº 1 enviado')
        .and('contain', TEST_CUSTOMER.email)

      cy.openHistory('quote')
      cy.get('[data-testid="history-entry"]').should('have.length', 1).and('contain', total)
      cy.intercept('POST', '**/api/orders/submit', (req) => {
        const body = req.body as { orderNumber: number; fromQuoteNumber: number }
        expect(body.fromQuoteNumber).to.equal(1)
        req.reply({
          statusCode: 201,
          body: {
            success: true,
            data: {
              orderNumber: body.orderNumber,
              quote: { groups: [], total: 0, currency: 'EUR', calculatedAt: new Date().toISOString() },
              emails: { customer: 'sent', agloval: 'skipped' },
            },
            timestamp: new Date().toISOString(),
          },
        })
      }).as('convert')
      cy.contains('[data-testid="history-entry"]', 'Presupuesto nº 1')
        .contains('button', 'Pasar a pedido')
        .click()
      cy.get('[role="dialog"]')
        .should('contain', 'Pasar a pedido')
        .within(() => {
          cy.contains(`Total: ${total}`).should('be.visible')
          cy.get('input[autocomplete="name"]').should('have.value', TEST_CUSTOMER.name)
          cy.get('input[type="checkbox"]').check()
          cy.contains('button', 'Enviar pedido a Agloval').click()
        })
      cy.wait('@convert')
      cy.get('[role="dialog"]').should('not.exist')
      cy.get('[role="status"]').should('contain', 'Presupuesto nº 1 pasado a pedido nº 1.')
      cy.contains('[data-testid="history-entry"]', 'Convertido en pedido nº 1')
        .contains('button', 'Pasar a pedido')
        .should('not.exist')

      cy.visit('/pedidos')
      cy.get('[data-testid="history-entry"]')
        .should('have.length', 1)
        .and('contain', 'Pedido nº 1')
        .and('contain', 'Desde presupuesto nº 1')
    })
  })

  it('shows a not-found page for unknown routes', () => {
    cy.visit('/no-existe')
    cy.contains('h2', 'Esta página no existe').should('be.visible')
    cy.contains('a', 'Volver al gestor').should('have.attr', 'href', '/')
  })
})
