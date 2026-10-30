# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `POST /api/quotes/submit`: prices a quote again on the server and emails it to the customer only ("Tu presupuesto · Presupuesto nº N"); Agloval is never emailed for a quote. It shares the per-IP limit of `POST /api/orders/submit` (5 submissions of either kind per 10 minutes).
- An optional `reference` (up to 80 characters) on order and quote submissions, shown as "Referencia: …" in the emails and appended to the Agloval subject.
- An optional `fromQuoteNumber` on order submissions, shown as "Desde el presupuesto nº M" in both order emails.
- Quote and order histories and the customer session now stay in sync across open browser tabs.
- History pages: `/presupuestos` and `/pedidos`, linked from the header as "Presupuestos" and "Pedidos". Each lists its entries with date, customer, reference, total and state ("Convertido en pedido nº M", "Desde presupuesto nº M"), and can be searched by number, customer or reference (ignoring case and accents). "Repetir" loads an entry back into the order manager.
- A "Esta página no existe" page for unknown addresses, and an SPA rewrite in `vercel.json` so the new routes load when opened directly.

### Changed
- Quotes and orders are kept in separate browser histories (up to 200 each); the existing order history moves automatically to the new format, keeping its numbering. Confirmed orders now also remember the customer's details.
- The history opens in its own browser tab instead of a window over the order manager. The logo and "Gestor de pedidos" in the header link back to the order manager, and the customer greeting is shown on every page.

### Fixed
- Emails use the singular for one item: "1 pieza", "1 tablero", "1 barra".

### Removed
- The "Historial (N)" button and the history window (replaced by the history pages).

### Security

## [1.3.0] - 2026-10-22

The order manager. Changes agreed with Agloval after the v1.2.0 presentation: the tool carries Agloval's brand, the order stays in view while it is built, and a confirmed order is emailed to the customer and, once configured, to Agloval.

### Added
- Agloval branding: the "Gestor de pedidos" title, the Agloval logo, the brand cyan, and a "Volver a Agloval" link to the company website (configurable with `VITE_SITE_URL`).
- An accessible window component (focus kept inside, Escape and backdrop to close, focus returned on close), used for the order history and for sharing.
- A "Historial (N)" button in the header that opens the order history in a window.
- An order panel that stays in view on wide screens, titled with the number the order will get ("Pedido nº N"), with a total that animates when it changes; on phones and tablets, a bottom bar with the order number, the line count and the total.
- A "Tus datos" window on confirm that asks for name, email and phone, remembered in the browser as a simulated signed-in customer, with a greeting and "Cerrar sesión" in the header.
- `POST /api/orders/submit`: prices the order again on the server and emails the quote to the customer, and to Agloval when `ORDER_NOTIFICATION_EMAIL` is set. Emails are in Spanish, in HTML and plain text. A per-IP limit of 5 submissions per 10 minutes protects it.
- SMTP delivery through nodemailer, and a log-only mode when no SMTP server is configured, which keeps personal data out of the logs.
- Mailpit in `docker compose` as a local test inbox (http://localhost:8025).
- An end-to-end spec that submits a real order and reads both emails from Mailpit, run only when `CYPRESS_MAILPIT_URL` is set.

### Changed
- "Confirmar pedido" asks for the customer's details and sends the order; the success message reads "Pedido nº N enviado" with the address the quote went to.
- The page has two columns on wide screens and three sections; buttons, selections and focus rings use Agloval's colours.
- The browser tab reads "Gestor de pedidos · Agloval", and the footer names Aglomerados Valencia S.L.
- `createExpressApp` takes a single dependencies object.
- **Node 20 or newer is required** (nodemailer 10); the CI runs on Node 20.

### Removed
- The "4. Historial" block on the page (the history is in its window now).
- The portfolio text in the footer.

### Upgrade notes
- Use Node 20 or newer.
- No database migration.
- Optional mail variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ORDER_NOTIFICATION_EMAIL`. Without `SMTP_HOST` no email is sent. Keep `ORDER_NOTIFICATION_EMAIL` unset until Agloval decides to receive orders.
- In development: `docker compose up -d mailpit` and `SMTP_HOST=localhost`, `SMTP_PORT=1025` in `backend/.env`.
- Order numbers are still per browser, so two customers can both send a "Pedido nº 1"; a server-side number is needed before Agloval receives real orders.

## [1.2.0] - 2026-10-17

The new order flow. The calculator screen is rebuilt around families, three sales units and a multi-line order, on top of the catalog and the order quote API released in 1.1.0.

### Added
- Order screen in four full-width blocks: product selection, measures and quantity, current order, and history.
  - A family dropdown and a searchable product list with its own scroll; each row shows its measure, its price with the right unit, and how many of that product are already in the order.
  - A form per unit: boards take width, height and a quantity of identical pieces (checked against the 2 x 15 cm minimum and the board size); units and bars take a whole quantity, and bars show their fixed length.
  - A current-order summary with its own scroll and a total that is always visible, inline editing of quantities, and a per-board summary (area used, boards to buy, board type and price).
  - A numbered order history ("Pedido #N") with date, total and priced breakdown, reorder at today's prices (with a warning for products that no longer exist) and a two-step "clear history". Numbers are never reused after a deletion.
- `pricePerM2` in the board groups of the order quote.
- End-to-end tests rewritten for the new flow (39 Cypress tests against the real backend and catalog); the base URL is configurable with `CYPRESS_BASE_URL`, and the README explains how to run them on other ports.
- `docs/BRANCHING_AND_RELEASES.md`: how branches, stacked pull requests, versions and releases work in this repository.
- Known tariff data issues to confirm with Agloval, in `docs/MIGRATION_GUIDE.md`.

### Changed
- Board billing: the price of one board is rounded to cents first and the total is boards times that price, so the unit price shown multiplied by the count equals the total to the cent. A total can differ by one cent from 1.1.0, which rounded once at the end.
- A board group reads "16,00 m2 usados · 3 tableros de 285 x 210 cm" and "3 tableros x 85,94 EUR = 257,82 EUR"; the exported text uses the same wording.
- The product search runs on the server from two characters and combines with the family filter.
- The board count is computed in one place shared by the cutting calculator and the pricing.

### Removed
- The waste and utilisation percentage and the area visualizer.
- The three-column calculator and its components (product card, measurement form, pieces list, price display, cart preview, calculation history) and the old calculation hooks and API client functions.
- The shareable link to a calculation: quotes are stateless now, so "Copy link" became "Copy summary" and the WhatsApp and email options send the same plain-text summary. The PDF option still shows its "planned" message.

### Upgrade notes
- No database migration and no new environment variable for the application; only the optional `CYPRESS_BASE_URL` is new, for the end-to-end tests.
- The order history is stored in the browser under a new key (`agloval_order_history_v2`). Entries saved by earlier versions under `agloval_calculation_history` are neither read nor deleted, so they stop being shown.
- An intermediate billing rule that charged only the area used was replaced before this release; it never shipped in a tag.
- The board count is still an area-based estimate that does not nest pieces on boards, so it can under-count.

## [1.1.0] - 2026-10-17

Real Agloval catalog and the order quote API. The sample catalog is replaced by the real July 2026 tariff (2,690 articles in 62 families, sold as units, boards cut to size and bars), and the backend gains the endpoints the new order screen needs. The screen itself ships in v1.2.0.

### Added
- Product schema for the real catalog: `Category.code` (the tariff family code, kept as text), `Product.sku`, `Product.unit` (`UD`, `M2` or `ML`) and `Product.length_cm` for bars. Board dimensions and thickness become nullable because units and bars have none.
- Tariff import: a pure CSV parser and an idempotent import (`npm run catalog:import`) that upserts families by code and products by SKU. It is a dry run by default, writes a JSON report with no prices, and `--apply` requires a recent `pg_dump` (`npm run db:backup`).
- `backend/data/families.json`: display names for the 62 family codes, deduced from the article descriptions and meant to be corrected by the owner.
- `GET /api/families` with product counts per unit, and `family` and `unit` filters on `GET /api/products` and `GET /api/products/search`. List responses keep `count` (page size) and add `total` (all matches).
- `POST /api/orders/quote`: a stateless quote for an order made of board lines (pieces with a quantity), unit lines and bar lines, with products loaded in a single query.
- A quantity per piece in the cutting calculator, so 20 identical cuts are one piece.
- Skip pagination and deterministic ordering in the repositories.
- Isolated test database: backend tests refuse any database whose name does not end in `_test` (`DATABASE_URL_TEST`, `npm run db:test:setup`).
- Documentation: the catalog import procedure, known data issues in the tariff, an updated ERD, curl examples in the API reference.

### Changed
- Board pricing: boards are billed whole at the price per m2. The number of boards is an integer, no longer rounded to tenths.
- A piece must be at least 2 cm wide and 15 cm high (it was a fixed 10 cm), and no larger than the board.
- Updating a draft calculation re-quotes it at the current prices; creating one still records the quoted price.
- Database columns and tables use snake_case names through Prisma `@map` and `@@map`.
- Product responses carry `sku`, `unit`, `familyCode`, `familyName`, `pricePerM2` and `lengthCm`; `thickness` is returned as `null` instead of `0` when absent.
- Calculations only exist for `M2` products; other units are rejected with `UNSUPPORTED_PRODUCT_UNIT`.

### Fixed
- Updating and deleting a calculation now run inside a transaction.
- The import's backup guard rejects a truncated `pg_dump`, and the import always writes its report, even when a batch fails after others were committed.
- A calculation whose product has no board dimensions raises a typed error instead of returning zeros.

### Upgrade notes
- Take a `pg_dump` first. The migration `20260804095353_add_column_table_mapping` drops and recreates the tables, so it does not preserve rows. The new migration `20260807090000_add_catalog_fields` is `ALTER` only.
- Apply the migrations (`npx prisma migrate deploy`), then load the catalog: `npm run catalog:import` for a dry run, then `npm run catalog:import -- --apply --backup-file <dump>`.
- Backend tests need `DATABASE_URL_TEST` pointing at a `*_test` database.
- Known tariff data issues to confirm with Agloval are listed in `docs/MIGRATION_GUIDE.md`.

## [1.0.0] - 2026-08-04

Phase D — Documentation + deployment config, complete. MVP feature-complete: the root README's own Roadmap had declared v1.0 as "current target" with 5 criteria (calculation engine, API, DB persistence, testing, React UI) — all satisfied as of this release. Live deployment and auth remain future work (see `v1.1+` in the README Roadmap).

### Added
- `docs/DEPLOYMENT.md`: Vercel (frontend) + Render (backend) deployment runbook
- `docs/TROUBLESHOOTING.md`: expanded common local-dev issues reference
- `docs/ERD.md`: Mermaid schema diagram generated from the real `schema.prisma`
- `vercel.json` and `render.yaml`: deployment config scaffolds (no live deploy executed)
- `.github/workflows/test.yml`: CI running lint + backend tests (real Postgres service container) + frontend tests on push/PR to `main`

### Fixed
- `CHANGELOG.md`/`README.md` hadn't been updated for the already-tagged Phase C (`v0.3.0`) release
- Stale docs across `README.md`, `docs/2_CLAUDE_cutter.md`, and `frontend/README.md`: `REACT_APP_*` env var naming (this is a Vite app, requires `VITE_*`), a documented Context API that was never implemented (state lives in hooks), and an unused `JWT_SECRET` env var (no auth exists in this codebase)

## [0.3.0] - 2026-08-04

Phase C — Frontend + Integration, complete.

### Added
- Vite + TypeScript frontend scaffold: entry point, Tailwind/PostCSS config, Vitest test setup
- Axios-based API client (`services/api.ts`) and custom hooks: `useProducts`, `useCalculation`, `useCalculationHistory`, `useLocalStorage`
- Presentational components: `ProductCard`, `MeasurementForm`, `PiecesList`, `AreaVisualizer`, `PriceDisplay`, `CartPreview`, `CalculationHistory`, `HistoryItem`, `Alert`
- `CuttingCalculator` page wiring the full select product → measure pieces → price → save flow
- localStorage-backed calculation history (`useCalculationHistory`), with a history view wired into the main page
- Export/share UI: `ExportButton`, `ShareModal`, `services/export.ts`
- Responsive layout polish across breakpoints
- Cypress E2E suite: main cutting-calculator workflow, product selection, history, and responsive tests (4 specs)
- Unit/component tests (Vitest + React Testing Library): 7 test files across components, hooks, and services/utils

### Fixed
- `useCalculation`'s `calculate()` now returns its result and supports loading/recomputing a previously saved calculation
- Frontend surfaces real backend error messages instead of generic Axios error text

## [0.2.0] - 2026-08-01

Phase B — Backend API + Error handling, complete.

### Added
- `CalculationRequestDTO`/`CalculationResponseDTO`, Zod validation (`CalculationRequestSchema`, `CalculationUpdateSchema`)
- `ICalculateUseCase`/`IProductUseCase` input ports, `IProductRepository`/`ICalculationRepository` output ports
- `CalculationApplicationService`: orchestrates `CuttingCalculator` + persistence, including full update/delete (recomputes from new pieces, never trusts raw totals from a caller)
- `ProductNotFoundException`, `CalculationNotFoundException`, `InvalidCalculationStatusException` (409 for DRAFT-only violations)
- Express controllers, routes, and middleware: `errorHandler` (maps `DomainException` + Prisma `PrismaClientKnownRequestError` to HTTP status), `validation`, `logging`
- Real Prisma repositories (`ProductRepository`, `CalculationRepository`) and mappers, replacing the Phase B.2 stubs
- Full CRUD on `/api/calculations` (create, get, list, update, delete) and `/api/products` (list, get, search)
- 131 backend tests total (~98% statement coverage): unit, `supertest` HTTP integration, and Postgres-backed repository integration
- `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/MIGRATION_GUIDE.md`, `docs/DECISIONS.md`

### Changed
- `npm start` now runs via `tsx` (same as `dev`) instead of compiled `dist/` output, which fails under real Node ESM module resolution
- Root README, backend README, and `docs/2_CLAUDE_cutter.md` updated to reflect the actual Phase B API surface and file structure

### Fixed
- `.eslintrc.json` had a typo'd rule name that silently broke linting on every file since Phase A
- 9 source files were not Prettier-formatted
- Removed unused `joi` and `jsonwebtoken` dependencies (no auth code exists yet)

## [0.1.0] - 2026-08-01

Phase A — Setup + Domain layer + Database, complete.

### Added
- Initial project structure and monorepo scaffold (frontend + backend)
- Configuration files (TypeScript, ESLint, Prettier, Jest)
- Hexagonal architecture setup for backend
- Docker Compose configuration for PostgreSQL
- Documentation structure
- Prisma schema: Category, Product, Calculation, User models with indexes and migration-mapping notes
- Database seed script with 3 categories and 10 fictitious products
- Root README with project overview, quick start, and architecture rationale
- `CuttingCalculator` domain service: pure, zero-dependency board/waste calculation logic
- Domain exceptions (`InvalidPieceException`, `EmptyPiecesListException`, `InvalidBoardDimensionsException`, `InsufficientBoardAreaException`)
- 32 unit tests for `CuttingCalculator` (100% statement coverage on the service)

[Unreleased]: https://github.com/borja8dev/agloval-custom-cutter/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/borja8dev/agloval-custom-cutter/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/borja8dev/agloval-custom-cutter/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/borja8dev/agloval-custom-cutter/releases/tag/v0.2.0
[0.1.0]: https://github.com/borja8dev/agloval-custom-cutter/releases/tag/v0.1.0
