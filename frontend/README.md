# Gestor de pedidos (Agloval) - Frontend

React 18 application with TypeScript for the Gestor de pedidos (Agloval) order manager UI.

## Architecture

```
src/
├── pages/           # Route pages (CuttingCalculator, HistoryPage for quotes and orders)
├── components/      # Reusable UI components
├── hooks/           # State management lives here (useFamilies, useProducts, useOrder,
│                     # useOrderQuote, useHistory, useLocalStorage) — no Context/Redux
├── services/        # API communication (api.ts) + export/share (export.ts)
├── utils/           # Formatters
├── styles/          # Tailwind and global styles
└── test/            # Test setup and utilities
```

## Getting Started

```bash
npm install
npm run dev
```

The app runs on port 3000 by default. See `.env.example` for configuration.

### Routes

`App.tsx` is the shared layout (header, content, footer) with `react-router-dom`:

| Path | Page |
|------|------|
| `/` | Order manager (`CuttingCalculator`) |
| `/presupuestos` | Quote history, with search by number, customer or reference, and "Pasar a pedido" |
| `/pedidos` | Order history, with the same search |
| anything else | "Esta página no existe" with a link back to `/` |

The header links "Presupuestos" and "Pedidos" open the histories in a new tab, so the order being built is never replaced by accident. "Repetir" on a history entry goes to `/` with the router state `{ reorder: <number>, kind: 'quote' | 'order' }`; the order manager loads that entry once and clears the state.

### Confirming

"Confirmar" in the order panel opens "Confirmar envío". The customer picks **Presupuesto** (the default: `POST /api/quotes/submit`, emailed to the customer only, saved in the quote history) or **Pedido** (`POST /api/orders/submit`, sent to Agloval, saved in the order history), each card previewing the number it will get, then fills their details, an optional reference and the privacy checkbox. The panel and the mobile order bar show no number, because it depends on that choice.

"Pasar a pedido" on a quote that is not an order yet re-prices its lines with today's products, warns when the price changed or a product no longer exists (sending is then blocked), and sends it as an order with `fromQuoteNumber`; the quote is then marked "Convertido en pedido nº N".

## Testing

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e      # E2E tests
```

### End-to-end tests

The Cypress specs in `cypress/e2e` run against the real backend and the real catalog, so both servers must be up (the backend with the catalog loaded) before running them. They are not part of CI.

The base URL defaults to `http://localhost:3000` and can be overridden with `CYPRESS_BASE_URL`:

```bash
CYPRESS_BASE_URL=http://localhost:3101 npm run test:e2e:headless   # all specs
CYPRESS_BASE_URL=http://localhost:3101 npx cypress run --spec cypress/e2e/history.cy.ts
```

Example with the backend on port 5001 and the frontend on port 3101 (macOS AirPlay Receiver occupies port 5000, so the default backend port may be unavailable):

```bash
# backend
PORT=5001 CORS_ORIGIN=http://localhost:3101 npm run dev
# frontend
VITE_API_URL=http://localhost:5001 npm run dev -- --port 3101
```

Most specs stub the order submission, so they never send mail. `order-submission.cy.ts` sends one real order and reads both emails back from Mailpit; it is skipped unless `CYPRESS_MAILPIT_URL` is set. Start Mailpit (`docker compose up -d mailpit`), point the backend at it (`SMTP_HOST=localhost`, `SMTP_PORT=1025`) and run:

```bash
CYPRESS_BASE_URL=http://localhost:3101 CYPRESS_MAILPIT_URL=http://localhost:8025 npx cypress run --spec cypress/e2e/order-submission.cy.ts
```

The backend accepts 5 submissions per 10 minutes per address, so run this spec on its own rather than in a loop.
