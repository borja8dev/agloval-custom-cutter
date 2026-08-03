# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

### Security

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
