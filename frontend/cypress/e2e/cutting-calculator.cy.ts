import { formatCents, groupPriceCents, parseCents, wholeBoardsPrice } from '../support/money'

const SUPERPAN = 'SUPERPAN WHITE SR209 SM 10mm 285x210'
const SCREW = 'TORNILLO SPAX 3,5 X 20'
const BAR = 'BARRA COLGAR OVALADA ALUMINIO 3,90MT'

const totalText = (cents: number) => `Total: ${formatCents(cents)} EUR`

// Price shown in the product row ("5,44 EUR/m2", "0,12 EUR/ud", "4,20 EUR/m"), in cents.
const listedPriceCents = (name: string) =>
  cy
    .contains('[data-testid="product-item"]', name)
    .find('[data-testid="product-price"]')
    .invoke('text')
    .then((text) => {
      const match = text.match(/(\d+,\d{2}) EUR\/(?:m2|ud|m)/)
      if (!match) throw new Error(`No price in row "${text}"`)
      return parseCents(match[1])
    })

// Board size shown in the product row ("285 x 210 cm · 10 mm"), in cm.
const listedBoardSize = (name: string) =>
  cy
    .contains('[data-testid="product-item"]', name)
    .find('[data-testid="product-measure"]')
    .invoke('text')
    .then((text) => {
      const match = text.match(/(\d+) x (\d+) cm/)
      if (!match) throw new Error(`No board size in "${text}"`)
      return { width: Number(match[1]), height: Number(match[2]) }
    })

// Whole-board billing for a used area in cm2 on the listed board of a product.
const wholeBoardsFor = (name: string, usedAreaCm2: number) =>
  listedBoardSize(name).then((board) =>
    listedPriceCents(name).then((pricePerM2) => ({
      pricePerM2,
      board,
      ...wholeBoardsPrice(usedAreaCm2, board.width, board.height, pricePerM2),
    }))
  )

const boardsText = (boards: number) => `${boards} ${boards === 1 ? 'tablero' : 'tableros'}`

const sumOfGroupPrices = ($groups: JQuery<HTMLElement>) =>
  [...$groups].reduce((sum, group) => sum + groupPriceCents(group.textContent ?? ''), 0)

describe('Cutting calculator', () => {
  beforeEach(() => {
    cy.visitCalculator()
  })

  it('starts with an empty order', () => {
    cy.get('[data-testid="order-lines"]').should('contain', 'El pedido está vacío')
    cy.get('[data-testid="order-total"]').should('have.text', totalText(0))
    cy.contains('button', /^Confirmar$/).should('be.disabled')
    cy.contains('button', 'Vaciar pedido').should('be.disabled')
  })

  it('bills 20 pieces of 100 x 80 by the whole boards that must be bought', () => {
    cy.pickProduct(SUPERPAN)
    // 16 m2 of pieces (160000 cm2) on 285 x 210 boards: the count rounds up.
    wholeBoardsFor(SUPERPAN, 100 * 80 * 20).then(({ board, boards, pricePerBoardCents, totalCents }) => {
      cy.addBoardPiece(100, 80, 20)

      cy.get('[data-testid="quote-group"]')
        .should('have.length', 1)
        .and('contain', '16,00 m² usados')
        .and('contain', `${boardsText(boards)} de ${board.width} x ${board.height} cm`)
        .and(
          'contain',
          `${boardsText(boards)} x ${formatCents(pricePerBoardCents)} EUR = ${formatCents(totalCents)} EUR`
        )
      cy.get('[data-testid="order-total"]').should('have.text', totalText(totalCents))
    })
    cy.get('[data-testid="order-line"]').should('contain', '100 x 80 cm')
    cy.get('input[aria-label="Cantidad de piezas 100 x 80 cm"]').should('have.value', '20')
    cy.contains('button', /^Confirmar$/).should('be.enabled')
  })

  it('adds up board, unit and bar groups into the order total', () => {
    cy.pickProduct(SUPERPAN)
    cy.addBoardPiece(100, 80, 1)
    cy.pickProduct(SCREW)
    listedPriceCents(SCREW).then((unitPrice) => {
      cy.addQuantity(3)
      cy.contains('[data-testid="order-line"]', SCREW).find('[data-testid="quote-group"]').as('screwGroup')
      cy.get('@screwGroup').should('contain', `3 x ${formatCents(unitPrice)} EUR`)
      cy.get('@screwGroup').should('contain', `= ${formatCents(unitPrice * 3)} EUR`)
    })
    cy.pickProduct(BAR)
    cy.addQuantity(2)

    cy.get('[data-testid="order-line"]').should('have.length', 3)
    cy.get('[data-testid="quote-group"]').should('have.length', 3)
    cy.contains('[data-testid="order-line"]', BAR).find('[data-testid="quote-group"]').should('contain', '2 barras de 3,90 m')
    cy.get('[data-testid="quote-group"]').then(($groups) => {
      cy.get('[data-testid="order-total"]').should('have.text', totalText(sumOfGroupPrices($groups)))
    })
  })

  it('validates the piece size before adding it', () => {
    cy.pickProduct(SUPERPAN)

    cy.fillBoardPiece(1, 100)
    cy.get('[data-testid="add-piece-btn"]').click()
    cy.contains('El ancho mínimo es 2 cm').should('be.visible')

    cy.fillBoardPiece(100, 10)
    cy.get('[data-testid="add-piece-btn"]').click()
    cy.contains('El alto mínimo es 15 cm').should('be.visible')
    cy.contains('El ancho mínimo').should('not.exist')

    cy.fillBoardPiece(286, 100)
    cy.get('[data-testid="add-piece-btn"]').click()
    cy.contains('El ancho máximo es 285 cm').should('be.visible')

    cy.fillBoardPiece(100, 211)
    cy.get('[data-testid="add-piece-btn"]').click()
    cy.contains('El alto máximo es 210 cm').should('be.visible')

    cy.get('[data-testid="order-lines"]').should('contain', 'El pedido está vacío')
    cy.get('[data-testid="order-line"]').should('not.exist')
  })

  it('accepts the smallest and the largest valid pieces', () => {
    cy.pickProduct(SUPERPAN)
    cy.addBoardPiece(2, 15, 1)
    cy.addBoardPiece(285, 210, 1)
    cy.get('input[aria-label^="Cantidad de piezas"]').should('have.length', 2)
    cy.get('[data-testid="order-total"]').should('not.contain', '--')
  })

  it('validates the quantity of a unit product', () => {
    cy.pickProduct(SCREW)
    cy.get('[data-testid="quantity-input"]').clear()
    cy.get('[data-testid="quantity-input"]').type('0')
    cy.get('[data-testid="add-line-btn"]').click()
    cy.contains('La cantidad debe ser un entero entre 1 y').should('be.visible')
    cy.get('[data-testid="order-line"]').should('not.exist')
  })

  it('shows how many items of a product are in the order', () => {
    cy.pickProduct(SUPERPAN)
    cy.get('[data-testid="in-order-badge"]').should('not.exist')
    cy.addBoardPiece(100, 80, 3)
    cy.addBoardPiece(50, 40, 2)
    cy.contains('[data-testid="product-item"]', SUPERPAN)
      .find('[data-testid="in-order-badge"]')
      .should('have.text', '5 en el pedido')
  })

  it('updates the total when a quantity is edited inline', () => {
    cy.pickProduct(SUPERPAN)
    wholeBoardsFor(SUPERPAN, 100 * 80 * 20).then((full) => {
      cy.addBoardPiece(100, 80, 20)
      cy.get('[data-testid="order-total"]').should('have.text', totalText(full.totalCents))

      cy.get('input[aria-label="Cantidad de piezas 100 x 80 cm"]').clear()
      cy.get('input[aria-label="Cantidad de piezas 100 x 80 cm"]').type('10{enter}')
      cy.wait('@quote')

      cy.get('[data-testid="quote-group"]').should('contain', '8,00 m² usados')
      const half = wholeBoardsPrice(100 * 80 * 10, full.board.width, full.board.height, full.pricePerM2)
      cy.get('[data-testid="order-total"]').should('have.text', totalText(half.totalCents))
    })
  })

  it('updates a unit quantity inline and removes a line', () => {
    cy.pickProduct(SUPERPAN)
    cy.addBoardPiece(100, 80, 1)
    cy.pickProduct(SCREW)
    cy.addQuantity(2)
    cy.get('[data-testid="order-line"]').should('have.length', 2)

    cy.get(`input[aria-label="Cantidad de ${SCREW}"]`).clear()
    cy.get(`input[aria-label="Cantidad de ${SCREW}"]`).type('5{enter}')
    cy.wait('@quote')
    cy.contains('[data-testid="order-line"]', SCREW).find('[data-testid="quote-group"]').should('contain', '5 x')

    cy.contains('[data-testid="order-line"]', SCREW).contains('button', 'Eliminar línea').click()
    cy.wait('@quote')
    cy.get('[data-testid="order-line"]').should('have.length', 1)
    cy.get('[data-testid="quote-group"]')
      .should('have.length', 1)
      .then(($groups) => {
        cy.get('[data-testid="order-total"]').should(
          'have.text',
          totalText(sumOfGroupPrices($groups))
        )
      })

    cy.contains('button', 'Eliminar pieza').click()
    cy.get('[data-testid="order-line"]').should('not.exist')
    cy.get('[data-testid="order-total"]').should('have.text', totalText(0))
  })

  it('empties the whole order with "Vaciar pedido"', () => {
    cy.pickProduct(SCREW)
    cy.addQuantity(4)
    cy.get('[data-testid="order-line"]').should('have.length', 1)

    cy.contains('button', 'Vaciar pedido').click()

    cy.get('[data-testid="order-line"]').should('not.exist')
    cy.get('[data-testid="order-lines"]').should('contain', 'El pedido está vacío')
    cy.get('[data-testid="order-total"]').should('have.text', totalText(0))
    cy.get('[data-testid="in-order-badge"]').should('not.exist')
    cy.contains('button', /^Confirmar$/).should('be.disabled')
  })

  it('shows a Spanish alert and blocks confirmation when the quote fails', () => {
    cy.pickProduct(SCREW)
    cy.intercept('POST', '**/api/orders/quote', {
      statusCode: 500,
      body: { success: false, error: { message: 'No se pudo calcular el pedido' } },
    }).as('quoteError')
    cy.get('[data-testid="quantity-input"]').clear()
    cy.get('[data-testid="quantity-input"]').type('2')
    cy.get('[data-testid="add-line-btn"]').click()
    cy.wait('@quoteError')

    cy.get('[role="alert"]').should('contain', 'No se pudo calcular el pedido')
    cy.contains('button', /^Confirmar$/).should('be.disabled')
  })
})
