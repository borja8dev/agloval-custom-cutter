# Agloval Custom Cutter - Backend

Node.js/Express API with hexagonal architecture for custom cutting calculations and pricing.

## Architecture

```
src/
├── domain/              # Core business logic (zero dependencies)
│   ├── entities/        # Data models
│   ├── services/        # Pure business logic
│   └── exceptions/      # Custom exceptions
├── application/         # Use cases and ports
│   ├── ports/           # Interface definitions
│   ├── services/        # Application services
│   └── dto/             # Request/response contracts
└── infrastructure/      # Adapters (Express, Prisma, etc.)
    ├── web/             # HTTP controllers and routes
    ├── persistence/     # Database repositories
    ├── config/          # Configuration
    ├── seed/            # Database seeding
    └── security/        # Authentication and security
```

## Getting Started

```bash
npm install
npm run dev
```

The server runs on port 5000 by default. See `.env.example` for configuration.

## Testing

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Database

```bash
npm run prisma:migrate    # Run migrations
npm run prisma:studio     # Open Prisma Studio
npm run seed              # Seed test data
```
