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
- [ ] **T16** Headings without "1. 2. 3."; product name shown once in the order panel (`QuoteGroupList` `showProductName`). Route: inline (2 small files + tests).
- [ ] **T17** Backend: `POST /api/quotes/submit`, optional `reference`, `fromQuoteNumber`, singular/plural in emails, shared rate limit, docs. Route: delegated writer (many files).
- [ ] **T18** History data layer: `HistoryRepository`, quote and order histories, v2 → v3 migration, cross-tab `storage` sync. Route: delegated writer.
- [ ] **T19** `react-router-dom`, layout with shared header, `/presupuestos` and `/pedidos` pages with search, SPA rewrite in `vercel.json`. Route: delegated writer.
- [ ] **T20** Quote → order flow: "Guardar presupuesto", reference field, "Pasar a pedido" with price-change notice, "Repetir". Route: delegated writer.
- [ ] **T21** Cypress: adapt history specs, stubbed quote flow, Mailpit spec for quote and conversion. Route: delegated writer.
- [ ] **Release v1.4.0**

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
_Nothing yet._

## Next step
T16.
