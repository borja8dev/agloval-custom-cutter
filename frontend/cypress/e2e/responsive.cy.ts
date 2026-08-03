describe('Responsive Design', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/products*').as('getProducts');
  });

  describe('Mobile (375px)', () => {
    beforeEach(() => {
      cy.viewport(375, 812);
      cy.visit('/');
    });

    it('should be usable on mobile with no horizontal scroll', () => {
      cy.wait('@getProducts');

      cy.contains('Calculadora de Corte').should('be.visible');
      cy.get('[data-testid="product-card"]').first().should('be.visible');

      cy.selectProduct(0);

      cy.get('[data-testid="width-input"]').should('be.visible');
      cy.get('[data-testid="height-input"]').should('be.visible');

      cy.addPiece(100, 100);

      cy.get('[data-testid="calculate-btn"]').should('be.visible');

      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(
          doc.documentElement.clientWidth
        );
      });
    });

    it('should have tap-friendly buttons on mobile', () => {
      cy.wait('@getProducts');
      cy.selectProduct(0);
      cy.addPiece(100, 100);

      cy.get('[data-testid="calculate-btn"]').should(($btn) => {
        expect($btn[0].getBoundingClientRect().height).to.be.at.least(40);
      });
    });
  });

  describe('Tablet (768px)', () => {
    beforeEach(() => {
      cy.viewport(768, 1024);
      cy.visit('/');
    });

    it('should show a 2-column grid', () => {
      cy.wait('@getProducts');

      cy.contains('h2', '1. Selecciona tablero')
        .parent()
        .parent()
        .should(($grid) => {
          const columnCount = window
            .getComputedStyle($grid[0])
            .gridTemplateColumns.split(' ').length;
          expect(columnCount).to.eq(2);
        });
    });
  });

  describe('Desktop (1280px)', () => {
    beforeEach(() => {
      cy.viewport(1280, 720);
      cy.visit('/');
    });

    it('should show the full 3-column layout', () => {
      cy.wait('@getProducts');

      cy.contains('1. Selecciona tablero').should('be.visible');
      cy.contains('2. Añade medidas').should('be.visible');
      cy.contains('3. Resultado').should('be.visible');

      cy.contains('h2', '1. Selecciona tablero')
        .parent()
        .parent()
        .should(($grid) => {
          const columnCount = window
            .getComputedStyle($grid[0])
            .gridTemplateColumns.split(' ').length;
          expect(columnCount).to.eq(3);
        });
    });
  });
});
