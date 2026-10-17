# Real catalog migration and frontend rework

Plan of record: `/Users/borja/.claude/plans/users-borja-documents-tarifa-agloval-ju-quizzical-crane.md`

## Objective
Replace the test DB with the real Agloval tariff (CSV, July 2026), then rebuild the frontend around families and UD/M2/ML units.

## Decisions
- M2 `pvp1` is per m2. ML is sold as UD with fixed length (total = pvp1 x length x qty).
- Families: fam->name map deduced by the assistant, corrected by the user before load.
- Minimum piece: width 2 cm x length 15 cm.
- Order is one step, history in localStorage. Customer accounts are out of scope.

## Delivery strategy
feature-branch-chain (chosen by user). Integration branch: `claude/frontend-bd-migration-104645`; small PRs target it (catalog, backend, frontend). Forecast well over 400 changed lines.

## Tasks
- [x] T1 chore(repo): ignore data/source and data/reports; copy CSV; verify with git status (route: inline, 1 mechanical file; git check-ignore matched both paths, CSV absent from git status)
- [x] T2 isolated test DB (DATABASE_URL_TEST) so deleteMany never touches the catalog (route: inline, small files. RED: suite failed on missing module; GREEN: 12 suites / 138 tests pass on agloval_cutting_test; guard refuses agloval_cutting_dev)
- [x] T3 schema ALTER migration (Category.code, Product.sku/unit/lengthCm, nullable dims/thickness) + mapper + ProductRecord (route: delegated writer, 5+ non-trivial files; RED: new mapper/service suites failed to compile; GREEN: 12 suites / 148 tests, tsc and lint clean, migrate status up to date on test DB; migration 20260807090000_add_catalog_fields)
- [x] T4 parseCatalogCsv (pure, TDD) (route: delegated writer; RED: suite failed on missing module; GREEN: 13 suites / 175 tests, tsc and lint clean; real CSV parses 2690 rows, 0 skipped, UD 2001 / M2 607 / ML 82, 62 families; warnings: 33 percent prefix, 7 dot prefix, 8 duplicate-description rows, 2 dimension mismatches)
- [x] T5 import-catalog CLI: dry-run/apply, report, pg_dump guard, families.json (route: delegated writer; RED: 5 suites failed on missing modules; GREEN: 18 suites / 202 tests, tsc and lint clean; real dry-run: 2690 rows, 0 skipped, 62 families all named; --apply without --backup-file refused before any DB client; NOT applied to any DB. families.json is a draft pending user correction)
- [ ] T6 docs: MIGRATION_GUIDE + ERD; validate counts (2001/607/82, 62 families) after user OK
- [x] T7a backend catalog API: GET /api/families, family/unit filters on products, product DTO with sku/unit/family, min piece 2x15 cm, M2 billed by whole boards at pricePerM2, null-dimension hardening (branch feat/catalog-api-filters, commit 97dbb00; route: delegated writer; RED observed for the domain suites only, the other suites were written first but their RED was not observed; GREEN: 22 suites / 268 tests, tsc and lint clean. Native review: medium tier, 1285 lines; the reliability lens failed twice on the 32000 output token limit, so by the user's decision the review was abandoned and T7a ships verified by tests only)
- [x] T7b backend order quote: stateless POST /api/orders/quote with M2 groups, UD and ML lines, total (branch feat/order-quote-api, commits 21d1161 and 2282f75; route: delegated writer, RED observed for all six suites (compile failures for the two existing ones); GREEN: 26 suites / 324 tests, tsc and lint clean. Native review offered (medium, 1200 lines) and skipped by the user)
- [x] T8a frontend data and state: types, API client (families, product filters, order quote), hooks (useFamilies, useProducts by family, useOrderQuote, useOrder, useOrderHistory with numbered orders in localStorage) (branch feat/frontend-order-data, commits 4ee5353, 12567bd, 4fd26b1; route: delegated writer, RED observed per test file; GREEN: 16 files / 113 tests, build and lint clean; each commit verified in isolation. Review mode is off)
- [x] T8b1 frontend picker components: FamilySelect, ProductList (internal scroll, in-order badge, search box), OrderLineForm (unit-aware: M2 width/height/quantity, UD/ML quantity with fixed measure shown) (branch feat/frontend-product-picker, commits b9da7c1, cdc5673, 15542fe, 034e178; route: delegated writer, RED observed per test file; GREEN: 19 files / 165 tests, build and lint clean; each commit verified in isolation)
- [x] T8b2 frontend order components: OrderSummary (lines with internal scroll, sticky total, per-board-group summary), OrderHistory (grouped by Pedido #N, breakdown, reorder, internal scroll) (branch feat/frontend-order-views, commits 992877b, a1b7c8e, fb509f5; route: delegated writer, RED observed per test file; GREEN: 22 files / 203 tests, build and lint clean; each commit verified in isolation)
- [x] T8c frontend page: stacked full-width layout, remove AreaVisualizer/waste/CartPreview/PriceDisplay, adapt export/share (branch feat/frontend-order-page, commits a3dfb9d and 564c7cd; route: delegated writer, RED observed for the page, export, ExportButton and useProducts tests; GREEN: 20 files / 197 tests, build and lint clean; both commits verified in isolation; Cypress specs now red until T9)
- [x] T7c bill M2 by used area (option C): BoardPricing, quote and calculation services, quote group display, API docs (branch feat/bill-used-area; route: delegated writer; RED observed per changed test file (compile failures in the backend, text mismatches in the frontend); GREEN: backend 26 suites / 333 tests, frontend 20 files / 199 tests, builds and lint clean)
- [x] T9 rewrite Cypress specs for the four-block flow against the loaded catalog; make the base URL and ports configurable without editing config (branch feat/e2e-order-flow; route: delegated writer; GREEN: 39/39 Cypress tests passing on two consecutive full runs against the real backend and catalog, plus a parent spot check of history.cy.ts 7/7; tsc on the cypress folder, build and lint clean; no app bugs found)

## Route per task
Pending (record inline/delegated and trigger evidence as each task starts).

## Progress / evidence
- T1-T5 and docs committed. Native review of the catalog slice (tier high, 40 files, 1746 lines): consent granted by the user, 4 lenses, one CRITICAL finding (R4-001: backup guard accepted a truncated pg_dump) fixed in 93ec329 (119 lines), targeted validation approved, acknowledged and authority burned. 14 non-blocking advisory findings remain as follow-ups (warnings on backup-db.sh DB name parsing, CalculationApplicationService null-dimension handling at lines 35-41 and 130-133, readability suggestions in the catalog modules).
- Second native review of the same slice plus the first correction (tier high, 40 files, 1849 lines): consent granted, 4 lenses, one CRITICAL finding (R4-001: a failed apply skipped the report, so partial writes left no record) fixed in 757cd70 (154 lines), validated, approved, acknowledged and authority burned. 15 advisory findings, all non-blocking.
- Review boundary advances to 757cd70. Next review base is that commit.
- Advisory follow-ups worth doing in T7: null-dimension handling in CalculationApplicationService (lines 32-38, 130-133, flagged by two lenses), DB name parsing in backup-db.sh, runImport.ts size and structure.
- Decision (user, superseded 2026-10-15): M2 was charged by whole boards. REPLACED by option C: M2 is charged by the m2 actually used (price = used area x pricePerM2); the number of boards stays informational. Reason: the board count is area-based with no real nesting, so billing whole boards from it was inaccurate anyway.
- Review mode: user asked to disable it for this clone (clone-local off) after repeated consent prompts on the accumulated branch. Ordinary checks (tests, lint, build) still apply.
- Not blocking T7: user is reviewing backend/data/families.json before `--apply` on the dev DB.

## Decision update 2026-10-16 (user)
Option C (bill the used m2) is replaced: boards are always bought whole, so a computed 3.7 boards is billed as 4. Price per board = boardArea x pricePerM2 rounded to cents; total = boards x price per board, so the unit price times the count equals the total shown. The board count remains the area-based estimate.
- [x] T7d bill whole boards again (round the count up): BoardPricing, quote and calculation services, quote group display, export text, API docs and the e2e price assertions (branch feat/bill-whole-boards; route: delegated writer plus a parent fix; RED observed for the pricing and component tests (the two service suites were updated after the code, noted by the writer); GREEN: backend 26 suites / 336 tests, frontend 20 files / 199 tests, Cypress 39/39 on the full run. The first e2e run exposed a spec bug (board size read from row text where the SKU digits run into it), fixed with product-measure and product-price test ids)
