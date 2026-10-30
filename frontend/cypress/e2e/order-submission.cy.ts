import { TEST_CUSTOMER } from '../support/customer'

// Real end-to-end submission: the backend prices the order, sends the emails
// to Mailpit (a local test inbox) and this spec reads them back. It only runs
// when CYPRESS_MAILPIT_URL is set, so it never sends mail by accident, and it
// submits once per run to stay under the backend's 5-per-10-minutes limit.

const SUPERPAN = 'SUPERPAN WHITE SR209 SM 10mm 285x210'

interface MailpitSummary {
  ID: string
  Subject: string
  To: Array<{ Address: string }>
  ReplyTo: Array<{ Address: string }>
}

const mailpitUrl = (): string | undefined => Cypress.env('MAILPIT_URL') as string | undefined

// Mailpit stores the message a moment after the API answers, so poll briefly.
function findMessages(query: string, attempts = 20): Cypress.Chainable<MailpitSummary[]> {
  return cy
    .request(`${mailpitUrl()}/api/v1/search?query=${encodeURIComponent(query)}`)
    .then((response) => {
      const messages = (response.body as { messages: MailpitSummary[] }).messages
      if (messages.length > 0 || attempts <= 1) return cy.wrap(messages)
      return cy.wait(250).then(() => findMessages(query, attempts - 1))
    })
}

function messageText(id: string): Cypress.Chainable<string> {
  return cy
    .request(`${mailpitUrl()}/api/v1/message/${id}`)
    .then((response) => (response.body as { Text: string }).Text)
}

describe('Order submission by email', () => {
  before(function () {
    if (!mailpitUrl()) this.skip()
  })

  it('sends the order to the customer and to Agloval and shows the order number', () => {
    // A unique address per run finds this run's messages without clearing the inbox.
    const email = `cypress.${Date.now()}@example.test`
    cy.intercept('POST', '**/api/orders/submit').as('submitOrder')

    cy.visitCalculator()
    cy.selectFamily('03')
    cy.pickProduct(SUPERPAN)
    cy.addBoardPiece(100, 80, 20)

    cy.get('[data-testid="order-total"]')
      .invoke('text')
      .then((totalText) => {
        const amount = /Total: ([\d.,]+) EUR/.exec(totalText)?.[1] ?? ''
        expect(amount, 'order total').not.to.equal('')

        cy.contains('button', /^Confirmar$/).should('be.enabled').click()
        cy.get('[role="dialog"]').should('contain', 'Confirmar envío')
        cy.get('[role="radiogroup"]').contains('label', 'Pedido').click()
        cy.get('[role="radiogroup"]')
          .contains('label', 'Pedido')
          .invoke('text')
          .then((cardText) => {
            const orderNumber = Number(/Pedido nº (\d+)/.exec(cardText)?.[1])
            expect(orderNumber, 'order number shown in the confirmation window').to.be.greaterThan(0)

            cy.get('[role="dialog"]').within(() => {
              cy.get('input[autocomplete="name"]').clear()
              cy.get('input[autocomplete="name"]').type(TEST_CUSTOMER.name)
              cy.get('input[autocomplete="email"]').clear()
              cy.get('input[autocomplete="email"]').type(email)
              cy.get('input[autocomplete="tel"]').clear()
              cy.get('input[autocomplete="tel"]').type(TEST_CUSTOMER.phone)
              cy.get('input[type="checkbox"]').check()
              cy.contains('button', 'Enviar pedido a Agloval').click()
            })

            cy.wait('@submitOrder').then(({ response }) => {
              expect(response?.statusCode).to.equal(201)
              const emails = (response?.body as { data: { emails: { agloval: string } } }).data
                .emails
              cy.get('[role="dialog"]').should('not.exist')
              cy.get('[role="status"]').should(
                'contain',
                `Pedido nº ${orderNumber} enviado a Agloval. Te hemos mandado una copia a ${email}.`
              )
              cy.get('aside h3').should('have.text', 'Tu pedido')
              cy.get('header').should('contain', `Hola, ${TEST_CUSTOMER.name.split(' ')[0]}`)

              // The customer's copy of the quote.
              findMessages(`to:"${email}"`).then((messages) => {
                expect(messages, 'customer email').to.have.length(1)
                expect(messages[0].Subject).to.equal(
                  `Hemos recibido tu solicitud · Pedido nº ${orderNumber}`
                )
                messageText(messages[0].ID).should('contain', amount)
              })

              // Agloval's copy only exists when the backend has ORDER_NOTIFICATION_EMAIL set.
              if (emails.agloval === 'sent') {
                findMessages(`subject:"Nuevo pedido nº ${orderNumber}"`).then((messages) => {
                  const ours = messages.filter((m) => m.ReplyTo.some((r) => r.Address === email))
                  expect(ours, 'Agloval email replying to the customer').to.have.length(1)
                  messageText(ours[0].ID)
                    .should('contain', amount)
                    .and('contain', email)
                    .and('contain', TEST_CUSTOMER.phone)
                })
              }
            })
          })
      })
  })
})
