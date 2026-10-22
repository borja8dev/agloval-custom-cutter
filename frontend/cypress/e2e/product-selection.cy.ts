const SUPERPAN = 'SUPERPAN WHITE SR209 SM 10mm 285x210'
const SCREW = 'TORNILLO SPAX 3,5 X 20'
const BAR = 'BARRA COLGAR OVALADA ALUMINIO 3,90MT'

describe('Product selection', () => {
  beforeEach(() => {
    cy.visitCalculator()
  })

  it('shows the three blocks in order', () => {
    cy.contains('h1', 'Gestor de pedidos').should('be.visible')
    cy.get('h2').then(($headings) => {
      expect([...$headings].map((h) => h.textContent)).to.deep.equal([
        '1. Selecciona producto',
        '2. Medidas y cantidad',
        '3. Pedido actual',
      ])
    })
    cy.get('section[aria-labelledby="block-products"]').should('exist')
    cy.get('section[aria-labelledby="block-history"]').should('not.exist')
    cy.contains('header button', 'Historial (0)').should('be.visible')
  })

  it('lists the families with their product counts', () => {
    cy.get('@families').then((interception) => {
      const families = (
        interception as unknown as {
          response: { body: { data: { families: { name: string; productCount: number }[] } } }
        }
      ).response.body.data.families.filter((family) => family.productCount > 0)
      expect(families.length).to.be.greaterThan(10)
      cy.get('[data-testid="family-select"] option').should('have.length', families.length + 1)
      cy.get('[data-testid="family-select"] option')
        .first()
        .should('have.text', 'Todas las familias')
      families.forEach((family) => {
        cy.get('[data-testid="family-select"]').contains(
          'option',
          `${family.name} (${family.productCount})`
        )
      })
    })
  })

  it('filters the list by family and reports how many are shown', () => {
    cy.selectFamily('03')
    cy.get('@products').then((interception) => {
      const data = (
        interception as unknown as {
          response: { body: { data: { products: unknown[]; total: number } } }
        }
      ).response.body.data
      expect(data.total).to.be.greaterThan(data.products.length)
      cy.get('[data-testid="product-item"]').should('have.length', data.products.length)
      cy.contains(`Mostrando ${data.products.length} de ${data.total}`).should('be.visible')
    })
    // Retried until the rendered rows are the filtered ones, not the previous page.
    cy.get('[data-testid="product-item"]').should(($items) => {
      $items.each((_, item) => {
        expect(item.textContent).to.contain('SUPERPAN')
      })
    })
  })

  it('narrows the list with a text search of 2+ characters', () => {
    cy.get('[data-testid="product-search"]').type('TORNILLO SPAX')
    cy.wait('@products')
    cy.get('[data-testid="product-item"]').should(($items) => {
      expect($items.length).to.be.greaterThan(0)
      $items.each((_, item) => {
        expect(item.textContent).to.contain('TORNILLO')
      })
    })
    cy.get('[data-testid="product-search"]').clear()
    cy.get('[data-testid="product-search"]').type('zzzzzz-no-existe')
    cy.wait('@products')
    cy.contains('No hay productos para este filtro').should('be.visible')
  })

  it('highlights the selected product and moves the highlight on a new selection', () => {
    cy.pickProduct(SUPERPAN)
    cy.get('[data-testid="product-item"][aria-selected="true"]').should('have.length', 1)
    cy.contains('[data-testid="product-item"]', SUPERPAN).should('contain', 'Tablero')
    cy.pickProduct(SCREW)
    cy.get('[data-testid="product-item"][aria-selected="true"]')
      .should('have.length', 1)
      .and('contain', SCREW)
  })

  it('asks to pick a product before showing any form', () => {
    cy.contains('Selecciona un producto para añadirlo al pedido').should('be.visible')
    cy.get('[data-testid="add-piece-btn"]').should('not.exist')
    cy.get('[data-testid="add-line-btn"]').should('not.exist')
  })

  it('shows width, height and quantity for a board', () => {
    cy.pickProduct(SUPERPAN)
    cy.get('[data-testid="width-input"]').should('be.visible')
    cy.get('[data-testid="height-input"]').should('be.visible')
    cy.get('[data-testid="quantity-input"]').should('be.visible')
    cy.get('[data-testid="add-piece-btn"]').should('be.visible')
    cy.get('[data-testid="add-line-btn"]').should('not.exist')
  })

  it('shows only the quantity for a unit product', () => {
    cy.pickProduct(SCREW)
    cy.get('[data-testid="quantity-input"]').should('be.visible')
    cy.get('[data-testid="add-line-btn"]').should('be.visible')
    cy.get('[data-testid="width-input"]').should('not.exist')
    cy.get('[data-testid="height-input"]').should('not.exist')
    cy.contains('Medida fija').should('not.exist')
  })

  it('shows the quantity and the fixed length for a bar', () => {
    cy.pickProduct(BAR)
    cy.get('[data-testid="quantity-input"]').should('be.visible')
    cy.get('[data-testid="add-line-btn"]').should('be.visible')
    cy.get('[data-testid="width-input"]').should('not.exist')
    cy.contains('Medida fija: 3,90 m').should('be.visible')
  })
})

export {}
