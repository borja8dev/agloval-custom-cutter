# Quotes and orders (Ferran review, round 2)

Tracking: borja8dev/agloval-custom-cutter#23 · Milestone v1.4.0 · Base: `main` = v1.3.0

## Objective
Separate a **quote** (emailed only to the customer) from an **order** (also emailed to Agloval), let a quote be converted into an order later, keep both histories on their own pages with search by number, customer or reference, and tidy the order panel.

## Why
Many Agloval customers resell. They need a quote to show their own client before committing to an order with Agloval.

## Constraints
- Histories stay in the browser (no accounts), behind a repository interface so they can move to the server later.
- Existing order history (`agloval_order_history_v2`) migrates automatically without data loss; corrupt data never crashes the app.
- The server always re-prices. Agloval is never emailed for a quote. Nothing goes to a real Agloval address (Mailpit only).
- Shared per-IP limit (5 per 10 minutes) for quote and order submissions.
- Customer-provided text (name, reference) is validated with Zod and escaped in email HTML; no personal data in server logs.

## Delivery
Strategy `feature-branch-chain` (stacked PRs merged in order), as in v1.1.0–v1.3.0. Review mode (RDD) is disabled by the user.

## Tasks
- [x] **T16** Headings without "1. 2. 3."; product name shown once in the order panel (`QuoteGroupList` `showProductName`). Route: inline (2 small files + tests).
- [x] **T17** Backend: `POST /api/quotes/submit`, optional `reference`, `fromQuoteNumber`, singular/plural in emails, shared rate limit, docs. Route: delegated writer (many files).
- [x] **T18** History data layer: `HistoryRepository`, quote and order histories, v2 → v3 migration, cross-tab `storage` sync. Route: delegated writer.
- [x] **T19** `react-router-dom`, layout with shared header, `/presupuestos` and `/pedidos` pages with search, SPA rewrite in `vercel.json`. Route: delegated writer.
- [x] **T20** Quote → order flow. Changed on 2026-10-30 at the user's request: one "Confirmar" button opens "Confirmar envío", where the user chooses **Presupuesto** (default) or **Pedido** with two selectable cards, then fills the customer details and an optional reference; the entry is saved to the matching history. "Pasar a pedido" (with a price-change notice) and "Repetir" from the quote history. Route: delegated writer.
- [x] **T21** Cypress: adapt history specs, stubbed quote flow, Mailpit spec for quote and conversion. Route: delegated writer.
- [x] **Release v1.4.0**

## Acceptance criteria
- Headings read "Selecciona producto", "Medidas y cantidad", "Pedido actual"; each order line shows the product name once.
- A saved quote emails only the customer and appears under "Presupuestos"; "Pasar a pedido" emails Agloval with "desde presupuesto nº M" and marks the quote converted.
- The header links "Presupuestos" and "Pedidos" open new tabs titled "Historial de presupuestos · Agloval" / "Historial de pedidos · Agloval".
- Search finds entries by number, customer name or reference (case and accent insensitive).
- Old v2 orders appear under "Pedidos" after upgrading.
- Emails say "1 tablero", "1 pieza", "1 barra".

## Checks
Backend: `npm test`, `tsc`, lint. Frontend: `npm test -- --run`, build, lint. Cypress against the real backend; Mailpit for emails. CI green on every PR.

## Progress
- **T16** done (inline). Commit `3a9cf35`, PR #24. RED→GREEN: new `QuoteGroupList` "can leave out the product name" and `OrderSummary` "names each product once" tests; heading expectations. Frontend 26 files / 263 tests; Cypress cutting-calculator, product-selection, responsive, history 43/43; CI green.
- **T17** done (delegated writer; trigger: 2+ non-trivial backend files). PR `feat/quote-submission`. Writer RED→GREEN on emails, schemas, services, controllers. Parent spot check: `tsc` ok, lint ok, non-DB suites 29 passed / 407 tests. The 3 DB suites need `DATABASE_URL_TEST`, which this worktree does not expose: verified by CI. Live check against Mailpit: a quote sends only "Tu presupuesto · Presupuesto nº 1" to the customer; an order with `fromQuoteNumber` and a `<…>` reference sends both emails, escaped in HTML, with "1 tablero".

- **T18** done (delegated writer; paused by the user on 2026-10-29 and resumed on 2026-10-30). Branch `feat/history-repository`. Writer RED→GREEN: history utils 18/27 failing first, repository, hooks, `useLocalStorage` storage sync, calculator storing the customer. Parent spot check: frontend 28 files / 289 tests, `tsc` ok. Live migration in the browser: the v2 order nº 1 (85,94 €) moved to v3 as `kind: 'order'`, v2 removed, counter kept.
- CI only runs on PRs to `main`, so the DB suites of T17 run when the chain merges.

- **T19** done (delegated writer). Branch `feat/history-pages`. Writer RED→GREEN: 17 failing tests first (routing, header nav, titles, search, router-state reorder). Parent spot check: frontend 30 files / 311 tests; full Cypress against the real backend 45 passed, 1 skipped (Mailpit spec, opt-in); `/pedidos` checked in the browser.

- **T20** done (delegated writer). Branch `feat/quote-order-flow`. Writer RED→GREEN in api, CustomerDetailsForm, ConfirmSubmissionForm, OrderSummary, HistoryList, CuttingCalculator and HistoryPage tests. Parent spot check: frontend 31 files / 345 tests; full Cypress against the real backend **including the Mailpit spec**: 47/47. "Confirmar envío" window checked in the browser.
- **T21** largely covered inside T19/T20 (history specs rewritten, quote → order spec, Mailpit spec updated). Remaining: Mailpit check that a quote produces only the customer email.

- **T21** covered inside T19/T20 (history specs rewritten, quote → order spec, Mailpit spec). Checked by hand in the browser and Mailpit on 2026-10-30: a quote sends only "Tu presupuesto · Presupuesto nº 1" to the customer; "Pasar a pedido" sends "Hemos recibido tu solicitud · Pedido nº 2" and "Nuevo pedido nº 2 · María García · Obra Calle Mayor 12".
- Chain merged in order: #24, #25, #26, #27, #28. Each PR was retargeted to `main` and passed CI (including the DB suites) before merging.
- **Release v1.4.0**: this PR, then an annotated tag and a GitHub release.

## Next step
Before real orders: a server-side order number, a privacy policy link and `ORDER_NOTIFICATION_EMAIL`.
