# Agloval Custom Cutter - Backend

Node.js/Express API with hexagonal architecture for custom cutting calculations and pricing.

## Architecture

```
src/
├── domain/                  # Core business logic (zero dependencies)
│   ├── services/            # CuttingCalculator
│   └── exceptions/          # Domain exceptions
├── application/              # Use cases and ports
│   ├── ports/in/             # Input ports (use case interfaces)
│   ├── ports/out/            # Output ports (repository interfaces)
│   ├── services/             # CalculationApplicationService, ProductUseCaseAdapter
│   ├── validation/           # Zod schemas
│   ├── exceptions/           # Application exceptions
│   └── dto/                  # Request/response contracts
└── infrastructure/           # Adapters (Express, Prisma)
    ├── web/                  # Controllers, routes, middleware
    ├── persistence/          # Prisma repositories & mappers
    └── config/                # Express app + Prisma client
```

See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the full layering rationale.

## API

`POST/GET/PUT/DELETE /api/calculations`, `GET /api/products` (+ `:id`, `/search`). Full reference: [docs/API.md](../docs/API.md).

## Getting Started

```bash
npm install
npm run dev
```

The server runs on port 5000 by default. See `.env.example` for configuration.

### Running in production

```bash
npm start
```

`start` runs the TypeScript source directly via `tsx`, same as `dev` — it does **not** run `npm run build`'s compiled `dist/` output. This project's `"type": "module"` + relative imports without explicit `.js` extensions means `node dist/server.js` fails under real Node ESM resolution (`ERR_MODULE_NOT_FOUND`); `tsx`'s resolver doesn't have that restriction. `npm run build` (`tsc`) still exists and is useful as a type-check gate (CI, pre-commit), just isn't the deploy path.

## Testing

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Database

1. Copy the environment template and start PostgreSQL via Docker:
   ```bash
   cp .env.example .env
   docker-compose up -d
   ```
   (run from the repo root — `docker-compose.yml` lives there)

2. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

3. Seed test data:
   ```bash
   npm run seed
   ```

4. (Optional) Browse the database:
   ```bash
   npm run prisma:studio
   ```
