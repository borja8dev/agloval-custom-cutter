# Database Schema (ERD)

Generated from the real `backend/prisma/schema.prisma` — 4 models: `Category`, `Product`, `Calculation`, `User`.

```mermaid
erDiagram
    CATEGORY ||--o{ PRODUCT : contains
    PRODUCT ||--o{ CALCULATION : "priced in"

    CATEGORY {
        string id PK
        string name UK
    }

    PRODUCT {
        string id PK
        string name
        string description "nullable"
        string categoryId FK
        int standardWidth "cm"
        int standardHeight "cm"
        int thickness "mm"
        int minWidth "nullable, cm"
        int minHeight "nullable, cm"
        int maxWidth "nullable, cm"
        int maxHeight "nullable, cm"
        decimal pricePerUnit "Decimal(10,2), EUR per board"
        decimal pricePerM2 "nullable, Decimal(10,2)"
        string currency "default EUR"
        datetime createdAt
        datetime updatedAt
    }

    CALCULATION {
        string id PK
        string productId FK
        json requestedPieces "array of width,height in cm"
        decimal totalAreaNeeded "Decimal(10,3), m2"
        decimal boardsUsed "Decimal(6,3), e.g. 1.2 boards"
        decimal pricePerBoard "Decimal(10,2), captured at calc time"
        decimal totalPrice "Decimal(10,2)"
        string status "DRAFT | SUBMITTED | COMPLETED"
        string userId "nullable, NOT an enforced FK"
        datetime createdAt
        datetime updatedAt
        datetime expiresAt "nullable, quote validity window"
    }

    USER {
        string id PK
        string email UK
        string role "default CUSTOMER"
        datetime createdAt
    }
```

## Notes

- **`Calculation.userId` is not a real relation.** There's no `@relation` between `Calculation` and `User` in the schema — `User` exists as scaffolding for a future auth phase, and `userId` is whatever value the client sends, unverified. This is deliberate (see Known Limitations in the root `README.md`), not a missing foreign key that should be added.
- **Indexes:** `Product.categoryId`; `Calculation.userId`, `Calculation.status`, `Calculation.createdAt`.
- **`onDelete: Restrict`** on `Product → Category` and `Calculation → Product` — you can't delete a category or product that still has dependent rows.
- All monetary fields use `Decimal`, not `Float` — see `docs/DECISIONS.md` for why (float rounding is unacceptable for pricing).

For how these fields map to Agloval's eventual real-database column names, see `docs/MIGRATION_GUIDE.md` — that mapping lives in `// MIGRATION:` comments in the schema itself and in the persistence-layer mappers, not as Prisma `@map` directives (see `docs/ARCHITECTURE.md` for why the mapping boundary sits there).
