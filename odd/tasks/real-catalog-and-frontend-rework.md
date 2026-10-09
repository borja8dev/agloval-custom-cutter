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
- [ ] T8 frontend: FamilySelect/ProductList, unit-aware form, order summary, grouped history, remove AreaVisualizer/waste
- [ ] T9 rewrite Cypress specs

## Route per task
Pending (record inline/delegated and trigger evidence as each task starts).

## Progress / evidence
- T1-T5 and docs committed. Native review of the catalog slice (tier high, 40 files, 1746 lines): consent granted by the user, 4 lenses, one CRITICAL finding (R4-001: backup guard accepted a truncated pg_dump) fixed in 93ec329 (119 lines), targeted validation approved, acknowledged and authority burned. 14 non-blocking advisory findings remain as follow-ups (warnings on backup-db.sh DB name parsing, CalculationApplicationService null-dimension handling at lines 35-41 and 130-133, readability suggestions in the catalog modules).
- Second native review of the same slice plus the first correction (tier high, 40 files, 1849 lines): consent granted, 4 lenses, one CRITICAL finding (R4-001: a failed apply skipped the report, so partial writes left no record) fixed in 757cd70 (154 lines), validated, approved, acknowledged and authority burned. 15 advisory findings, all non-blocking.
- Review boundary advances to 757cd70. Next review base is that commit.
- Advisory follow-ups worth doing in T7: null-dimension handling in CalculationApplicationService (lines 32-38, 130-133, flagged by two lenses), DB name parsing in backup-db.sh, runImport.ts size and structure.
- Decision (user): M2 is charged by whole boards: boards = ceil(used area / board area), price = boards x board area x pricePerM2.
- Not blocking T7: user is reviewing backend/data/families.json before `--apply` on the dev DB.
