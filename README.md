# Agloval Custom Cutting Calculator

**Full-stack prototype for custom wood material cutting and pricing.**

A web solution that allows customers to purchase wood boards in custom dimensions instead of only standard sizes. The system calculates how much of the board is used and adjusts pricing automatically.

**Status:** In Development | **Current Version:** v0.1.0

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
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
│   │   │   ├── entities/        # Data models
│   │   │   ├── services/        # Domain services
│   │   │   └── exceptions/      # Custom exceptions
│   │   ├── application/         # Use cases & ports
│   │   │   ├── ports/           # Interfaces
│   │   │   ├── services/        # Application services
│   │   │   └── dto/              # Request/response objects
│   │   ├── infrastructure/      # Adapters (Express, Prisma)
│   │   │   ├── web/             # Controllers & routes
│   │   │   ├── persistence/     # Database repositories
│   │   │   ├── config/          # Configuration
│   │   │   └── seed/             # Data seeding
│   │   └── server.ts            # Express entry point
│   ├── test/                    # Test suites
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── seed.ts              # Dev seed data
│   │   └── migrations/          # Migration files
│   └── package.json
│
├── docs/                        # Additional documentation
│   └── 2_CLAUDE_cutter.md       # Project constitution / dev guidelines
│
├── docker-compose.yml           # PostgreSQL + pgAdmin
└── .gitignore
```

---

## Architecture

### Hexagonal (Ports & Adapters)

The backend follows hexagonal architecture for maintainability and scalability:

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

The API surface (Express controllers, routes, error handling) ships in **Phase B** and isn't implemented yet. It will be documented here once it exists.

---

## Development Phases

This project is built iteratively in phases:

| Phase | Focus | Status |
|-------|-------|--------|
| **A** | Setup + Domain layer + Database | In progress — schema & seed done, `CuttingCalculator` domain service next |
| **B** | Backend API + Error handling | Not started |
| **C** | Frontend UI + Integration | Not started |
| **D** | Testing + Documentation + Release | Not started |

Each phase is tagged in Git with semantic versioning.

---

## Testing

### Strategy

- **Unit Tests (Domain):** Pure business logic, no dependencies
- **Integration Tests (API):** Full endpoints with database
- **E2E Tests (UI):** Critical user flows

No tests exist yet — the testing frameworks (Jest, React Testing Library, Cypress) are configured, but the calculation engine they'd cover ships in Phase A.2.

**Target Coverage:** >70% backend, critical flows for E2E

---

## Design Decisions

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

- No real-time sync between tabs (stateless API by design)
- No historical analytics (future feature)
- No multi-language support (MVP is Spanish/English)
- No payment integration (manual order fulfillment)
- No authentication in v1.0 (future feature)

---

## Roadmap

### v1.0 (Current target)
- Core calculation engine
- API endpoints
- React UI
- Database persistence
- Testing framework

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
