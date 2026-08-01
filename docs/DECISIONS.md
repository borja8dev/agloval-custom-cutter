# Architectural Decisions

Short log of the non-obvious calls made across phases, and why. High-level "why hexagonal / why Prisma" reasoning lives in the root [README](../README.md#design-decisions) — this file is for the more specific, easy-to-second-guess decisions.

## Money fields are `Decimal @db.Decimal(10,2)`, not integer cents or a smaller precision

The original phase brief suggested `Decimal(6,2)` in one place and `Decimal(8,2)` in another (inconsistent with itself). `(6,2)` caps out at €9,999.99, too tight for `totalPrice` on a multi-board order. `(10,2)` gives real headroom without meaningfully increasing storage cost. Integer cents were considered and rejected — Prisma's `Decimal` type maps cleanly to Postgres `NUMERIC`, and using it avoids a manual `/100` conversion at every read/write site.

## No `@@fulltext` index on `Product`

Prisma's `fullTextIndex` preview feature only supports MySQL and MongoDB — declaring it on a PostgreSQL schema fails validation outright. Verified against Prisma docs, not assumed. Product search (`ProductRepository.search()`) currently uses `contains` + `mode: 'insensitive'` (stable on PostgreSQL since Prisma 2.8.0, also verified). A real GIN index is a raw-SQL migration to add later if search performance ever needs it — not a schema-level attribute.

## `CalculationRecord` (ports/out) and `CalculationResponseDTO` (dto) are deliberately different shapes

A repository returns `CalculationRecord` — flat fields mirroring what's persisted. The application service converts that into `CalculationResponseDTO` — nested, and including fields that are *computed*, not stored (`wastePercentage`, `pieceCount`, `averagePieceSize`). An earlier draft of the persistence layer had the repository build the full response DTO directly, including recomputing waste percentage — that duplicated business logic that already existed, correctly, in `CalculationApplicationService.mapToDTOFromEntity()`, and it also meant the repository couldn't satisfy its own port's declared return type (`ICalculationRepository.save()` promises `CalculationRecord`, not a DTO). Keeping the layers honestly separate fixed both problems at once.

## `PUT /api/calculations/:id` recomputes, it doesn't accept raw totals

The update endpoint takes `{ requestedPieces }` and re-runs `CuttingCalculator`, not `{ totalPrice, boardsNeeded, ... }` taken at face value. Accepting raw computed totals from a client would let a request just declare its own price — the same reasoning that put calculations on the backend in the first place (see README: "Backend-only Calculations"). The update path reuses the exact same domain call as create, so there's only one place area/price math happens.

## `BaseController.ok()`/`.error()` take `req` as a parameter, not instance state

An earlier version stored `this.request = req` on the controller instance inside each handler. Controllers are instantiated once and shared across every request (`express.ts` constructs them once at startup) — under concurrent async requests, one request's `this.request` assignment can be overwritten by another before the first one's `await` resolves, corrupting which `requestId` ends up in which response. Passing `req` explicitly removes the shared mutable state entirely.

## `products.routes.ts` registers `/search` before `/:id`

Express matches routes in registration order, and `/:id` matches any single path segment — including the literal string `"search"`. Registering `/:id` first would make `GET /api/products/search` match the `:id` route (treating `"search"` as an id) and the actual search handler would never run. This is a general rule for this codebase: literal/specific routes go before parameterized ones on the same router.

## `npm start` runs via `tsx`, not compiled `dist/` output

This project has `"type": "module"` and none of its relative imports carry explicit `.js` extensions. Real Node ESM resolution requires them — `tsc`'s compiled output would carry the same extension-less imports through unchanged, and `node dist/server.js` fails with `ERR_MODULE_NOT_FOUND` on the first relative import. Rather than hand-adding `.js` to ~25 files, `start` runs the TypeScript source directly via `tsx` (same as `dev`) — its resolver doesn't have that restriction. `npm run build` (`tsc`) still exists as a type-check gate, just isn't the deploy path.

## `Calculation.status` is a plain `String`, not a Prisma `enum`

Kept as a string (`"DRAFT" | "SUBMITTED" | "COMPLETED"` enforced at the TypeScript level, not the database level) specifically so it can absorb whatever status vocabulary Agloval's real system uses without a schema migration — see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

## Zod is the single source of truth for input validation

An early draft of `CalculationRequestDTO` included a hand-rolled `isCalculationRequestDTO()` type guard alongside the Zod schema — two independent implementations of the same shape check. Dropped the type guard: Zod already validates at the HTTP boundary (`validateRequest` middleware), and a second hand-maintained check is a drift risk (if one changes and the other doesn't, the inconsistency is silent) with no actual safety benefit.

## Auth is deliberately out of scope for Phase B, not silently stubbed

`GET /api/calculations` (list by user) returns `401` unconditionally because nothing sets `req.userId` — no JWT middleware, no session handling, `jsonwebtoken` isn't even a dependency. This was a scoping decision made explicitly (asked and confirmed) rather than building a fake/partial auth layer as part of a "polish" pass. Building real authentication is its own phase.
