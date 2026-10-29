const SUPERPAN = 'SUPERPAN WHITE SR209 SM 10mm 285x210'
const SCREW = 'TORNILLO SPAX 3,5 X 20'

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
] as const

const HEADINGS = [
  'Selecciona producto',
  'Medidas y cantidad',
  'Pedido actual',
]

const expectNoHorizontalScroll = () => {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth)
  })
}

const expectScrollContainer = (selector: string) => {
  cy.get(selector).should(($el) => {
    expect(getComputedStyle($el[0]).overflowY).to.equal('auto')
  })
}

const expectInViewport = (selector: string) => {
  cy.get(selector).should(($el) => {
    const rect = $el[0].getBoundingClientRect()
    expect(rect.top, `${selector} top`).to.be.at.least(0)
    expect(rect.bottom, `${selector} bottom`).to.be.at.most($el[0].ownerDocument.defaultView!.innerHeight)
  })
}

const expectMinHeight =(button: JQuery<HTMLElement>, min: number) => {
  expect(button[0].getBoundingClientRect().height).to.be.at.least(min)
}

describe('Responsive layout', () => {
  VIEWPORTS.forEach(({ name, width, height }) => {
    describe(`${name} (${width} x ${height})`, () => {
      beforeEach(() => {
        cy.viewport(width, height)
        cy.visitCalculator()
      })

      it('has no horizontal scroll and shows the three blocks', () => {
        expectNoHorizontalScroll()
        HEADINGS.forEach((heading) => {
          cy.contains('h2', heading).scrollIntoView().should('be.visible')
        })
        expectNoHorizontalScroll()
      })

      it('keeps the product list in its own scroll container', () => {
        expectScrollContainer('[data-testid="product-list"]')
        cy.get('[data-testid="product-list"]').should(($list) => {
          expect($list[0].scrollHeight).to.be.greaterThan($list[0].clientHeight)
        })
        expectNoHorizontalScroll()
      })

      it('keeps primary buttons tall enough to tap', () => {
        cy.pickProduct(SUPERPAN)
        cy.get('[data-testid="add-piece-btn"]').should(($btn) => expectMinHeight($btn, 40))
        cy.addBoardPiece(100, 80, 1)
        cy.contains('button', 'Confirmar pedido').should(($btn) => expectMinHeight($btn, 40))
        cy.contains('button', 'Vaciar pedido').should(($btn) => expectMinHeight($btn, 40))
        cy.pickProduct(SCREW)
        cy.get('[data-testid="add-line-btn"]').should(($btn) => expectMinHeight($btn, 40))
      })

      it('keeps the total visible with a long order and scrolls the order and the history window', () => {
        cy.pickProduct(SUPERPAN)
        for (let i = 0; i < 8; i++) {
          cy.addBoardPiece(20 + i * 10, 30 + i * 5, 2)
        }
        cy.pickProduct(SCREW)
        cy.addQuantity(3)
        cy.get('[data-testid="order-line"]').should('have.length', 2)

        expectScrollContainer('[data-testid="order-lines"]')
        cy.get('[data-testid="order-lines"]').should(($el) => {
          expect($el[0].scrollHeight).to.be.greaterThan($el[0].clientHeight)
        })

        cy.contains('h2', 'Pedido actual').scrollIntoView()
        expectInViewport('[data-testid="order-total"]')
        cy.contains('button', 'Confirmar pedido').should('be.visible')

        // Several saved orders make the history overflow its own container.
        cy.confirmOrder()
        cy.contains('header button', 'Historial (1)').should('exist')
        for (let i = 0; i < 6; i++) {
          cy.addQuantity(i + 1)
          cy.confirmOrder()
          cy.contains('header button', `Historial (${i + 2})`).should('exist')
        }
        cy.openHistory()
        cy.get('[data-testid="history-entry"]').should('have.length', 7)
        expectScrollContainer('[data-testid="order-history"]')
        cy.get('[data-testid="order-history"]').should(($el) => {
          expect($el[0].scrollHeight).to.be.greaterThan($el[0].clientHeight)
        })
        expectNoHorizontalScroll()
      })

      if (width >= 1024) {
        it('keeps the order panel, its number and its total in view while scrolling', () => {
          cy.get('aside').contains('h3', 'Pedido nº 1')
          cy.get('aside').should('have.css', 'position', 'sticky')
          cy.pickProduct(SUPERPAN)
          cy.addBoardPiece(100, 80, 2)
          cy.get('[data-testid="order-total"]').should('not.contain', '--')
          cy.get('[data-testid="order-bar"]').should('not.be.visible')

          // Back to the full catalog so both the list and the page can scroll.
          cy.get('[data-testid="product-search"]').clear()
          cy.wait('@products')
          cy.get('[data-testid="product-list"]').scrollTo('bottom')
          cy.scrollTo('bottom')
          cy.window().its('scrollY').should('be.greaterThan', 0)
          expectInViewport('[data-testid="order-total"]')
          expectInViewport('aside h3')
          expectNoHorizontalScroll()
        })
      } else {
        it('shows a bottom order bar that leads to the order', () => {
          cy.get('[data-testid="order-bar"]').should('not.exist')
          cy.pickProduct(SUPERPAN)
          cy.addBoardPiece(100, 80, 2)
          cy.get('[data-testid="order-total"]')
            .should('not.contain', '--')
            .invoke('text')
            .then((text) => {
              cy.get('[data-testid="order-bar"]')
                .should('be.visible')
                .and('contain', 'Pedido nº 1')
                .and('contain', '1 línea')
                .and('contain', text.replace('Total: ', ''))
            })
          expectInViewport('[data-testid="order-bar"]')

          cy.scrollTo('top')
          cy.get('[data-testid="order-bar"]').contains('button', 'Ver pedido').click()
          expectInViewport('#block-order')
          cy.focused().should('have.id', 'block-order')
          expectNoHorizontalScroll()
        })
      }
    })
  })
})

export {}
