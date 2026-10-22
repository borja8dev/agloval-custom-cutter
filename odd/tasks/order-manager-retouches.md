# Order manager retouches (after the meeting with Ferran)

Plan of record: `/Users/borja/.claude/plans/users-borja-documents-tarifa-agloval-ju-quizzical-crane.md`

## Objective
Turn the v1.2.0 calculator into the "Gestor de pedidos" with Agloval's branding, a history window opened from the header, an order panel that stays visible on the right, and a simulated order submission that asks for the customer's details and emails the quote to the customer and to Agloval (test inbox only for now).

## Decisions
- Order numbers stay per browser ("Pedido nº N" visible while building). Server-side numbering is future work, needed once Agloval receives real orders.
- Emails are built for real but go to Mailpit in development; nothing is sent to Agloval yet (`ORDER_NOTIFICATION_EMAIL` unset means no Agloval email).
- Simulated login: name, email and phone asked on confirm and remembered in the browser; "Cerrar sesión" clears them.
- Header colour: Agloval's brand cyan, measured from its logo as `#009EE2`; the header uses `#0091D0` so large white text keeps at least 3:1 contrast, controls are white pills with `#00628F` text, and the logo sits on a white badge because it is cyan on transparent.
- Logo downloaded from agloval.com with the user's permission. The repository is public, so the logo will be visible on GitHub.

## Delivery strategy
feature-branch-chain, as in the previous feature: the first PR targets `main`, each next PR targets the previous branch. Forecast well over 400 changed lines. Review mode is off for this clone.

## Tasks
- [x] T10 branding and header: brand colours, `AppHeader` with logo, "Gestor de pedidos" and "Volver a Agloval", title and footer (branch feat/order-manager-branding; route: delegated writer; RED observed for AppHeader, App and page tests; GREEN: 22 files / 202 tests, build, lint and cypress typecheck clean; checked in the browser at desktop and mobile widths)
- [x] T11 accessible `Modal`; history opened from a header button; block 4 removed (branch feat/history-window; route: delegated writer; RED observed per test file; GREEN: 23 files / 215 tests, build, lint and cypress typecheck clean; Cypress history 8/8, product-selection 9/9, responsive 12/12, cutting-calculator 11/11; checked in the browser. Known: focus returns to body after closing the share window because its opener is a menu item that disappears)
- [ ] T12 two-column layout with a sticky order panel ("Pedido nº N", animated total) and a mobile bottom bar; `nextNumber` from `useOrderHistory`
- [ ] T13 backend: `POST /api/orders/submit`, `IOrderNotifier` with SMTP (nodemailer) and log adapters, Spanish emails, per-IP limit, Mailpit in docker-compose, docs
- [ ] T14 frontend: customer details window on confirm, submission, simulated session in the header
- [ ] T15 Cypress updates and a submission spec checked through Mailpit
- [ ] Release v1.3.0

## Route per task
Recorded as each task starts.

## Progress / evidence
None yet.
