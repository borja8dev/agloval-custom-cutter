# Agloval Custom Cutting Calculator

**Full-stack prototype for custom wood material cutting and pricing.**

A web solution that allows customers to purchase wood boards in custom dimensions instead of only standard sizes. The system calculates how much of the board is used and adjusts pricing automatically.

**Status:** In Development | **Current Version:** v0.2.0

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Version](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## The Problem

Agloval SL sells wood materials (boards, laminates, etc) in standard sizes only. However, customers frequently want to purchase custom dimensions from a single board. For example:

- Standard board: 300cm × 200cm (price: €100)
- Customer needs: 2 pieces of 200cm × 100cm + 1 piece of 250cm × 120cm
- Current system: Cannot handle this order (only sells whole boards)
- Manual workaround: Agloval calculates by hand, quotes by email, slow & error-prone

**Impact:** Lost sales, manual labor, no order history.

---

## The Solution

An interactive calculator where:

1. Customer selects a standard board from catalog
2. Specifies desired piece dimensions (width × height)
3. System calculates area usage automatically
4. Price adjusts based on board utilization (e.g., "You need 1.2 boards = €120")
5. Customer places order

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL 15 + Prisma ORM |
| **Testing** | Jest (backend) + React Testing Library (frontend) + Cypress (E2E) |
| **Deployment** | Vercel (frontend) + Render (backend) |
| **Architecture** | Hexagonal (Ports & Adapters) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Docker & Docker Compose (for PostgreSQL)
- Git

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/borja8dev/agloval-custom-cutter.git
cd agloval-custom-cutter

# 2. Install dependencies (root has no workspaces yet — install each package)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Start PostgreSQL (Docker)
docker-compose up -d

# 4. Setup database (migrations + seeding)
cd backend
cp .env.example .env
npx prisma migrate dev
npm run seed
cd ..

# 5. Start dev server (frontend + backend concurrently)
npm run dev

# Frontend runs on: http://localhost:3000
# Backend runs on: http://localhost:5000
```

### Running Tests

```bash
# All tests
npm test

# Backend only
npm run test:backend

# Frontend only
npm run test:frontend

# E2E tests
npm run test:e2e

# Coverage report
npm run coverage
```

---

## Project Structure

```
agloval-custom-cutter/
├── README.md                    # This file
├── frontend/                    # React application
│   ├── src/
│   │   ├── pages/               # Page components
│   │   ├── components/          # Reusable components
│   │   ├── context/             # State management
│   │   ├── services/            # API communication
│   │   ├── hooks/                # Custom React hooks
│   │   └── utils/                # Utilities & constants
│   ├── public/
│   └── package.json
│
├── backend/                     # Node.js/Express API
│   ├── src/
│   │   ├── domain/              # Business logic (zero dependencies)
│   │   │   ├── services/        # CuttingCalculator (pure domain logic)
│   │   │   └── exceptions/      # Domain exceptions
│   │   ├── application/         # Use cases & ports
│   │   │   ├── ports/in/        # Input ports (use case interfaces)
│   │   │   ├── ports/out/       # Output ports (repository interfaces)
│   │   │   ├── services/        # CalculationApplicationService, adapters
│   │   │   ├── validation/      # Zod schemas
│   │   │   ├── exceptions/      # Application exceptions
│   │   │   └── dto/             # Request/response objects
│   │   ├── infrastructure/      # Adapters (Express, Prisma)
│   │   │   ├── web/             # Controllers, routes, middleware
│   │   │   ├── persistence/     # Prisma repositories & mappers
│   │   │   └── config/          # Express app + database client
│   │   └── server.ts            # Express entry point
│   ├── test/                    # Test suites (131 tests)
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── seed.ts              # Dev seed data
│   │   └── migrations/          # Migration files
│   └── package.json
│
├── docs/                        # Documentation
│   ├── 2_CLAUDE_cutter.md       # Project constitution / dev guidelines
│   ├── API.md                   # Endpoint reference
│   ├── ARCHITECTURE.md          # Hexagonal layering + rationale
│   ├── MIGRATION_GUIDE.md       # Mapping to Agloval's real database
│   └── DECISIONS.md             # Architectural decision log
│
├── docker-compose.yml           # PostgreSQL + pgAdmin
└── .gitignore
```

---

## Architecture

### Hexagonal (Ports & Adapters)

The backend follows hexagonal architecture for maintainability and scalability. Full diagram + layer-by-layer rationale: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

```
┌─────────────────────────────────────┐
│   Infrastructure (Express, Prisma)  │  ← External frameworks
├─────────────────────────────────────┤
│   Application (Services, DTOs)      │  ← Use cases & contracts
├─────────────────────────────────────┤
│   Domain (Business Logic)           │  ← Pure logic (no dependencies)
└─────────────────────────────────────┘
```

**Benefits:**
- Domain logic is testable without database or framework
- Easy to swap implementations (e.g., change database)
- Clear separation of concerns
- Production-grade architecture

---

## API

Base URL: `http://localhost:5000` (dev). Full reference with request/response examples: [docs/API.md](./docs/API.md).

| Method | Path | Description | Status codes |
|--------|------|-------------|---------------|
| `POST` | `/api/calculations` | Calculate + persist a cutting quote | `201`, `400` |
| `GET` | `/api/calculations/:id` | Fetch a calculation | `200`, `404` |
| `GET` | `/api/calculations?userId=` | List a user's calculations | `200`, `401`¹ |
| `PUT` | `/api/calculations/:id` | Recompute a DRAFT calculation from new pieces | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/calculations/:id` | Delete a DRAFT calculation | `204`, `404`, `409` |
| `GET` | `/api/products` | List products | `200` |
| `GET` | `/api/products/:id` | Fetch a product | `200`, `404` |
| `GET` | `/api/products/search?q=` | Search products by name/description | `200`, `400` |
| `GET` | `/health` | Health check | `200` |

¹ No authentication exists yet — see [Known Limitations](#known-limitations). `GET /api/calculations` currently 401s unconditionally since nothing sets a user identity.

Every response is wrapped as `{ success, data | error, timestamp, requestId }`. Domain and Prisma errors are translated to the appropriate 4xx status by a central error handler — see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## Development Phases

This project is built iteratively in phases:

| Phase | Focus | Status |
|-------|-------|--------|
| **A** | Setup + Domain layer + Database | **Done** — tagged `v0.1.0` |
| **B** | Backend API + Error handling | **Done** — tagged `v0.2.0` |
| **C** | Frontend UI + Integration | Not started |
| **D** | Testing + Documentation + Release | Not started |

Each phase is tagged in Git with semantic versioning.

---

## Testing

### Strategy

- **Unit Tests (Domain):** Pure business logic, no dependencies
- **Integration Tests (API):** Full endpoints with database
- **E2E Tests (UI):** Critical user flows

Backend has 131 tests across domain, application, and infrastructure layers (~98% statement coverage overall) — unit tests for `CuttingCalculator` and the application service, `supertest` integration tests for every controller against a real Express app, and repository integration tests against a real Postgres instance. E2E suites ship in Phase C once there's a UI to drive.

**Target Coverage:** >70% backend, critical flows for E2E

---

## Design Decisions

Full architectural decision log: [docs/DECISIONS.md](./docs/DECISIONS.md).

### Why Hexagonal Architecture?
- Aligns with industry standards (used at tier-1 companies)
- Domain logic independent of framework/database
- Easy to test and refactor
- Scales from MVP to production

### Why Prisma ORM?
- Type-safe database access
- Auto-generated migrations
- Easy schema exploration
- Future-proof for database changes

### Why React + Context API (not Redux)?
- Simpler for MVP
- Sufficient for this project scope
- Can upgrade to Zustand/Redux if needed

### Why Backend-only Calculations?
- Single source of truth
- Security (client can't manipulate calculations)
- Easier validation

---

## Known Limitations

- **No authentication.** `jsonwebtoken` isn't even installed — there's no login, session, or JWT middleware anywhere in the codebase. `requestedPieces`/`userId` on a calculation is just whatever the client sends, unverified. `GET /api/calculations` (list by user) is permanently unreachable (401) as a direct consequence — this is deliberate, not an oversight: building real auth is scoped as its own future phase, not something to bolt on as "polish."
- No real-time sync between tabs (stateless API by design)
- No historical analytics (future feature)
- No multi-language support (MVP is Spanish/English)
- No payment integration (manual order fulfillment)

---

## Roadmap

### v1.0 (Current target)
- [x] Core calculation engine
- [x] API endpoints
- [x] Database persistence
- [x] Testing framework
- [ ] React UI

### v1.1+ (Future)
- User accounts & authentication
- Order history & saved quotes
- PDF quote generation
- Email notifications
- Analytics dashboard
- Multi-language support
- Payment integration

---

## Contributing

This is a personal portfolio project. If you have feedback or suggestions:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-idea`
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)
4. Submit a pull request

---

## Troubleshooting

### "Port 5000 already in use"
```bash
lsof -i :5000
kill -9 <PID>
```

### "Database connection refused"
```bash
docker-compose up -d
npx prisma migrate dev
npm run seed
```

### "Frontend can't reach backend"
- Verify backend is running: `npm run dev:backend`
- Check `REACT_APP_API_URL` in `frontend/.env`
- Check `CORS_ORIGIN` in `backend/.env`

---

## License

MIT - See [LICENSE](./LICENSE) for details.

---

## Author

**Borja Rodríguez** | Backend Developer | Valencia, Spain

- GitHub: [@borja8dev](https://github.com/borja8dev)
- LinkedIn: [Borja Rodríguez](https://linkedin.com/in/borja-rodríguez-castillo-9606bb398)

---

## Acknowledgments

- Agloval SL for the real-world problem context
- React, Express, PostgreSQL communities for excellent tools
- Hexagonal architecture inspiration from domain-driven design principles

---

**See [CHANGELOG.md](./CHANGELOG.md) for version history.**
