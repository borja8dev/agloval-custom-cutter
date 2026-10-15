# Migration Guide — Connecting to Agloval's Real Database

This project's schema and DTOs were designed anticipating a future migration from the current Prisma/PostgreSQL schema to Agloval's real, existing database. This document collects the `// MIGRATION:` notes scattered through the codebase into one place, so the actual migration work starts from a checklist instead of a full re-read of the source.

**Core principle:** the mapping boundary is the persistence layer (`infrastructure/persistence/mappers/`), not the application or domain layers. If Agloval's real schema has different table/column names, that gets absorbed in the mappers — `CalculationApplicationService`, `CuttingCalculator`, and the DTOs should not need to change.

## Real catalog import (tariff CSV)

The real catalog arrives as a CSV export of Agloval's tariff (July 2026), not as a database to connect to. It is loaded with `backend/scripts/import-catalog.ts`; the ETL skeleton further down is kept only as a reference for a future database-to-database migration.

| CSV column | Stored as |
|---|---|
| `fam` | `Category.code` (text, leading zeros kept). Display name from `backend/data/families.json` |
| `art` | `Product.sku` (unique, upsert key). `art2` always equals `art` and is ignored |
| `des` | `Product.name` (leading `%` and `.` stripped); original text kept in `description` |
| `pvp1` | `M2`: `pricePerM2`, with `pricePerUnit` derived as the whole-board price. `UD`: `pricePerUnit`. `ML`: `pricePerUnit` per metre |
| `unimed` | `Product.unit`: `UD` (indivisible units), `M2` (boards cut to size), `ML` (bars sold whole, price per metre times length) |
| `medida1`, `medida2` | `M2`: board width and height in cm (metres x 100). `ML`: `lengthCm` from `medida1`. `UD`: ignored, the tariff fills them with placeholders |

Source file facts that the parser enforces: the first six lines are junk and the real header is `fam;art;des;pvp1;unimed;medida1;medida2;art2;`; separator `;`, decimal comma, UTF-8.

Procedure:
1. Keep the CSV in `data/source/` (gitignored: it contains Agloval's real prices). Reports go to `data/reports/` and dumps to `data/backups/`, both ignored too.
2. Dry-run (default, never connects to the database): `cd backend && npm run catalog:import`. Read the report for skipped rows and warnings.
3. Back up first: `npm run db:backup` (see the rollback procedures below).
4. Apply: `npm run catalog:import -- --apply --backup-file <dump>`. The importer refuses to run without a dump made in the last 24 hours. It is idempotent (upsert by `code` and `sku`), so re-running after a partial failure or after correcting `families.json` is safe.
5. Validate: counts by unit and family against the CSV, and a sample of prices.

Integration tests delete products and categories, so they run on a separate `*_test` database and refuse any other (see `docs/TROUBLESHOOTING.md`).

### Known data issues in the July 2026 tariff (to confirm with Agloval)

The importer flags these rows in its report; they are loaded as they come in the CSV. Prices are not listed here on purpose.

**Description and measures disagree** (`DIMENSIONS_MISMATCH`). The app uses the `medida1`/`medida2` columns, not the description, so the sold board size is the one in the columns:

| SKU | Description | `medida1` x `medida2` |
|---|---|---|
| `07V300000000` | CONT.FENOLICO VARIAS 30mm 250x122 | 1,00 x 1,00 m |
| `03GRGU38285S` | SUPERPAN GRIS GU SOF 38mm 285x210 | 2,44 x 1,22 m |

**Same description, different SKU** (`DUPLICATE_DESCRIPTION`). Both rows are imported; they may be real duplicates or a typo in one description:

| SKUs | Description |
|---|---|
| `280000014530`, `280000004530` | % TORNILLO SPAX 4,5 X 30 |
| `280000014545`, `280000004545` | % TORNILLO SPAX 4,5 X 45 |
| `12HV50CC0000`, `12HAV50CC000` | CHAPA HAYA VAPORIZADA 50mm CON COLA |
| `400800015070`, `400800015080` | PUERTA 4 CANTOS GRUPO-8 150X70 |

The last pair looks like a door of 150x70 and another of 150x80 whose description was not updated, judging by the SKU suffixes. That is an inference to confirm, not something the data proves.

Once Agloval corrects the Excel, export it again and re-run the import: it is idempotent and updates the rows by SKU.

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

## ETL script skeleton

> Reference only. The real catalog is loaded from the tariff CSV (see above); this skeleton applies if Agloval later exposes a database to read from.

If Agloval's real database isn't migrated in place (i.e. this schema doesn't just get pointed at it via `DATABASE_URL`), a one-off ETL script moves existing rows across. This is a skeleton, not a ready-to-run script — it assumes a second Prisma client (or raw `pg` client) connected to the real source database alongside the one connected to this project's schema.

```typescript
// scripts/migrate-from-real-db.ts (does not exist yet — skeleton only)
import { PrismaClient } from '@prisma/client';
import { ProductMapper } from '../src/infrastructure/persistence/mappers/ProductMapper';

const target = new PrismaClient(); // this project's schema
// const source = new RealDbClient(); // Agloval's real DB — driver/shape TBD at migration time

const BATCH_SIZE = 500;

async function migrateProducts() {
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // 1. EXTRACT a batch from the real source (shape unknown until integration — this
    //    is illustrative; replace with the real driver's query).
    const batch: unknown[] = []; // await source.query('SELECT * FROM productos LIMIT $1 OFFSET $2', [BATCH_SIZE, offset]);
    if (batch.length === 0) break;

    // 2. TRANSFORM each real row into this schema's shape. This is exactly what
    //    ProductMapper already does for Prisma rows — a real-source variant would
    //    live next to it (e.g. ProductMapper.fromRealSource(row)), not inline here.
    const transformed = batch.map((row) => ProductMapper.toDomain(row as never));

    // 3. LOAD idempotently — upsert on a stable natural key (e.g. the real DB's id,
    //    kept as a lookup field) so re-running the script after a partial failure
    //    doesn't duplicate rows.
    for (const record of transformed) {
      await target.product.upsert({
        where: { id: record.id },
        create: { ...record } as never,
        update: { ...record } as never,
      });
    }

    offset += BATCH_SIZE;
  }
}

async function main() {
  await migrateProducts();
  // migrateCategories(), migrateCalculations() follow the same extract/transform/load
  // shape, in dependency order (categories before products, products before calculations
  // — matches the @relation foreign keys in schema.prisma).
}

main().finally(() => target.$disconnect());
```

Key properties this skeleton is meant to preserve once it's filled in:

- **Batched**, not a single unbounded query — the real table sizes are unknown.
- **Idempotent** (`upsert` on a stable key) — safe to re-run after a partial failure without duplicating data.
- **Ordered by foreign-key dependency** — categories, then products, then calculations, then users.
- **Transform logic reuses the mappers**, not ad-hoc inline field renaming — keeps the "one place to look" property described above.

## Rollback procedures

Two different failure modes need two different rollbacks:

**A. The `DATABASE_URL` swap itself was wrong** (real DB is unreachable, misconfigured, or the mapper produces bad data on first traffic):
1. Revert `DATABASE_URL` back to this project's own Postgres instance — this is a config change, not a code change, so it's immediate.
2. Nothing else needs reverting: the application code never assumed which database it's talking to (that's the entire point of the port/mapper boundary).

**B. An ETL run corrupted or partially loaded data** (script above, or its real filled-in version, failed partway or wrote bad rows):
1. Take a database backup (`pg_dump`) **before** running any ETL script against a target that has real data in it — this is the actual rollback mechanism, not an afterthought.
2. If the ETL is idempotent (see above), the safe recovery is usually just fixing the bug and re-running it, not restoring from backup — upserts on a stable key overwrite bad rows rather than duplicate them.
3. If corruption isn't isolated to the ETL's own writes (e.g. a bad migration also altered pre-existing rows), restore the pre-ETL `pg_dump` backup and treat the run as if it never happened.
4. Keep the old/source database read-only and untouched during cutover — the ETL only ever reads from it, so it remains a valid fallback until the new database has been running in production long enough to trust.
