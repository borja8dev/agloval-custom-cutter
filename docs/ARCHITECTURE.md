# Architecture

The backend follows hexagonal architecture (ports & adapters). Dependencies point inward — infrastructure depends on application, application depends on domain, and domain depends on nothing.

```
┌──────────────────────────────────────────────────────────┐
│  Infrastructure                                            │
│  Express controllers/routes/middleware, Prisma repos       │
│  ──────────────────────────────────────────────────────── │
│  │  Application                                            │
│  │  Use cases, ports, DTOs, Zod validation                 │
│  │  ────────────────────────────────────────────────────  │
│  │  │  Domain                                              │
│  │  │  CuttingCalculator — pure, zero dependencies         │
│  │  │  ────────────────────────────────────────────────   │
└──────────────────────────────────────────────────────────┘
```

## Layers

### Domain (`src/domain/`)

`CuttingCalculator`: given a board's dimensions and a list of requested pieces, computes total area needed, boards needed (ceiling to the nearest 0.1 — "1.2 boards" is a real purchasable quantity, not a rounding artifact), and waste percentage. It imports nothing outside the standard library — no Express, no Prisma, no Node built-ins beyond types. This is deliberate: the calculation is the one piece of logic that must be correct and independently verifiable, so it's tested in complete isolation (32 tests, no database, no HTTP).

Domain exceptions (`DomainException` and its subclasses) carry an HTTP `statusCode` even though the domain layer has no concept of HTTP — this is a pragmatic compromise, not a violation of purity in practice: the domain doesn't import Express, it just annotates *how bad* a failure is, which infrastructure's error handler later reads. See [DECISIONS.md](./DECISIONS.md) for the reasoning.

### Application (`src/application/`)

- **`ports/in/`** — input ports (`ICalculateUseCase`, `IProductUseCase`): what infrastructure is allowed to call.
- **`ports/out/`** — output ports (`IProductRepository`, `ICalculationRepository`): what infrastructure must implement for persistence. These also define the *record shapes* (`ProductRecord`, `CalculationRecord`) the application layer works with — plain, Prisma-agnostic types, not Prisma's generated types leaking upward.
- **`services/`** — `CalculationApplicationService` implements `ICalculateUseCase`: orchestrates `CuttingCalculator` + the output ports. No business logic lives here — computing area/waste/price is the domain's job; this layer's job is sequencing (fetch product → calculate → persist → shape the response) and translating persistence-layer exceptions into use-case-level ones (`ProductNotFoundException`, `CalculationNotFoundException`).
- **`validation/`** — Zod schemas. Validate shape and basic constraints (positive numbers, string formats) before anything touches the domain. Domain validation (e.g. "this piece is bigger than the board") is a business rule and stays in `CuttingCalculator`, not duplicated here.
- **`dto/`** — the actual wire contract (`CalculationRequestDTO`/`CalculationResponseDTO`). Deliberately distinct from `CalculationRecord` (see below) and from the Prisma schema — this is the layer that's allowed to change shape without forcing a migration.

### Infrastructure (`src/infrastructure/`)

- **`web/`** — Express controllers, routes, middleware. Controllers are thin: validate (via middleware), call a use case, format the response (`BaseController.ok()`/`.error()`). No orchestration logic here.
- **`persistence/`** — `ProductRepository`/`CalculationRepository` implement the output ports using Prisma. `mappers/` convert between Prisma's generated entity shapes and the ports' `ProductRecord`/`CalculationRecord` — this is the one place that knows about `Prisma.Decimal`, JSON columns, and Prisma's `include` shapes.
- **`config/`** — `express.ts` wires the middleware chain and routes; `database.ts` holds the Prisma client singleton and a `healthCheck()`.

## Why the DTO/Record split

`CalculationResponseDTO` (application/dto) and `CalculationRecord` (application/ports/out) look similar but serve different purposes:

- `CalculationRecord` is what a **repository returns** — a flat shape mirroring roughly what's persisted (`totalPrice`, `status`, `boardsUsed` as direct fields), plus the minimum product context needed to derive things from it.
- `CalculationResponseDTO` is what the **API returns** — nested (`pricing.totalPrice`, `metadata.status`, `calculation.wastePercentage`), and includes fields that are *computed*, not stored (`wastePercentage`, `pieceCount`, `averagePieceSize` are derived from the record, not columns in the database).

`CalculationApplicationService.mapToDTOFromEntity()` is the single place that does this conversion. A repository that tried to build the full response DTO directly (skipping this step) would end up duplicating the waste-percentage/pieceCount computation in the wrong layer — which is exactly what an earlier draft of the persistence layer did, and why this split is enforced rather than incidental.

## Error handling

Every thrown `DomainException` subclass carries `code` + `statusCode`; the global `errorHandler` middleware reads those directly — no per-exception branching needed. It additionally recognizes `Prisma.PrismaClientKnownRequestError` and translates known codes (`P2002` unique violation, `P2003`/`P2025` foreign-key/not-found) to the right 4xx, with a fixed generic message — Prisma's own error text can include internal field/table names and never reaches a client, even in development.

## What's intentionally not built yet

- **Auth.** No JWT, no sessions, no password hashing. `userId` on a calculation is client-supplied and unverified. This is a scoping decision, not an oversight — see the root README's Known Limitations.
- **A full `ProductApplicationService`.** `ProductUseCaseAdapter` is a thin pass-through to `IProductRepository` — there's no orchestration need yet beyond "ask the repository," so a full service class would be premature structure.
- **A compiled production build.** `npm start` runs the TypeScript source directly via `tsx`, the same as `dev`. `tsc`'s compiled output would fail at runtime (`ERR_MODULE_NOT_FOUND`) because this project's ESM imports don't carry explicit `.js` extensions — see [DECISIONS.md](./DECISIONS.md).
