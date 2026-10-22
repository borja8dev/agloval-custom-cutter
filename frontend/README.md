# Gestor de pedidos (Agloval) - Frontend

React 18 application with TypeScript for the Gestor de pedidos (Agloval) order manager UI.

## Architecture

```
src/
├── pages/           # Page components (CuttingCalculator)
├── components/      # Reusable UI components
├── hooks/           # State management lives here (useFamilies, useProducts, useOrder,
│                     # useOrderQuote, useOrderHistory, useLocalStorage) — no Context/Redux
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
