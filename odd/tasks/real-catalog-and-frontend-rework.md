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
- [ ] T4 parseCatalogCsv (pure, TDD)
- [ ] T5 import-catalog CLI: dry-run/apply, report, pg_dump guard, families.json
- [ ] T6 docs: MIGRATION_GUIDE + ERD; validate counts (2001/607/82, 62 families) after user OK
- [ ] T7 backend: family/unit filters, /api/families, QuoteOrder, per-unit validation, min piece 2x15
- [ ] T8 frontend: FamilySelect/ProductList, unit-aware form, order summary, grouped history, remove AreaVisualizer/waste
- [ ] T9 rewrite Cypress specs

## Route per task
Pending (record inline/delegated and trigger evidence as each task starts).

## Progress / evidence
None yet.
