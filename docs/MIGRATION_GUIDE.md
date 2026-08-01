# Migration Guide — Connecting to Agloval's Real Database

This project's schema and DTOs were designed anticipating a future migration from the current Prisma/PostgreSQL schema to Agloval's real, existing database. This document collects the `// MIGRATION:` notes scattered through the codebase into one place, so the actual migration work starts from a checklist instead of a full re-read of the source.

**Core principle:** the mapping boundary is the persistence layer (`infrastructure/persistence/mappers/`), not the application or domain layers. If Agloval's real schema has different table/column names, that gets absorbed in the mappers — `CalculationApplicationService`, `CuttingCalculator`, and the DTOs should not need to change.

## Category → Agloval's category table

If Agloval already has a categories table, map by `name` (`Category.name` is unique in this schema — assume the same is true, or make it so, on the real side).

## Product → Agloval's `productos` table (hypothetical)

| This schema | Likely real column | Notes |
|---|---|---|
| `name` | `producto.nombre` | |
| `pricePerUnit` | `producto.precio_unitario` | See Decimal note below |
| `standardWidth` | `producto.ancho_estandar` | Confirm units — this schema is cm |

**Decimal vs. integer cents:** this schema stores prices as `Decimal @db.Decimal(10,2)` (e.g. `95.50`). If Agloval's real database stores prices as integer cents (`9550`), the mapper needs an explicit `/100` conversion — don't assume the shape matches.

**Full-text search:** the `Product` model doesn't declare a `@@fulltext` index — Prisma's `fullTextIndex` preview feature only supports MySQL/MongoDB, not PostgreSQL (verified against Prisma docs during Phase A.1; the original plan assumed it would work and was wrong). When product search needs to scale past `ProductRepository.search()`'s current `ILIKE`-based `contains`, add a GIN index (`pg_trgm` or `to_tsvector`) via a raw-SQL migration — not a schema-level Prisma attribute.

## Calculation → Agloval's `presupuestos` (quotes) table (hypothetical)

| This schema | Likely real column | Notes |
|---|---|---|
| `requestedPieces` (JSON) | `presupuesto.piezas_solicitadas` | Stored as JSON here deliberately — flexible if the real schema wants a normalized child table instead, that's a mapper-level decision, not a domain one |
| `totalPrice` | `presupuesto.precio_total` | |

**`totalAreaNeeded` is derivable from `requestedPieces`** — it doesn't strictly need its own column on the real side; it's stored here for query convenience and audit, not because it's irreducible.

**Why `pricePerBoard` is stored, not just referenced:** a calculation captures the product's price *at the moment it was calculated*. If `Product.pricePerUnit` changes later, existing calculations must keep showing the price the customer was actually quoted. This is an audit requirement, not a normalization oversight — don't "fix" it by dropping the column and joining to the live product price.

**Status workflow** (`DRAFT` → `SUBMITTED` → `COMPLETED`) is stored as a plain `String`, not a Prisma `enum`, specifically so it can absorb whatever status vocabulary the real system uses without a schema migration — just add mapping logic in `CalculationMapper`.

## User → auth (not built yet)

`User` is scaffolding only — see the root README's Known Limitations. `Calculation.userId` is accepted from API requests but currently unverified (no auth middleware exists). When real auth lands:
1. It's a new phase, not a schema change — the `User` table and `Calculation.userId` foreign-key-shaped field already exist.
2. `IProductRepository`/`ICalculationRepository` (the ports) don't need to change — only the infrastructure that populates `req.userId` (currently nothing does).

## DTO/API stability

`CalculationRequestDTO`/`CalculationResponseDTO` (`application/dto/`) are the actual wire contract — changing their shape breaks the frontend *and* whatever mapping this guide describes. If Agloval's real database has different field names or structure than this schema, absorb that difference in the mapper layer (`infrastructure/persistence/mappers/`), not by reshaping the DTOs. The DTOs should stay stable across a database migration; only the mappers should need to change.

## What actually changes on migration day

1. Swap `datasource db { url = env("DATABASE_URL") }` to point at the real database, or introduce a second Prisma schema/client if running against a genuinely different engine.
2. Rewrite `ProductMapper`/`CalculationMapper` to translate the real schema's shape into `ProductRecord`/`CalculationRecord` — these are the two files that should absorb 100% of the schema difference.
3. `ProductRepository`/`CalculationRepository`'s query logic may need to change (different table/column names), but their *method signatures* (defined by `IProductRepository`/`ICalculationRepository`) should not.
4. Nothing in `application/` or `domain/` should need to change. If it does, that's a signal the port boundary wasn't respected somewhere — see [ARCHITECTURE.md](./ARCHITECTURE.md).
