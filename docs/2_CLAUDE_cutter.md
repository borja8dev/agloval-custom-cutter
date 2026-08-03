# Agloval Custom Cutting Calculator - Project Constitution

**This file is auto-injected into Claude Code sessions. Read it first in every session.**

---

## PROYECTO AT A GLANCE

**Qué es:**
- Full-stack prototype: React frontend + Node.js/Express backend
- Resuelve problema real: Agloval clientes quieren comprar tableros en medidas custom
- MVP standalone: Funcional, UI bonita, datos ficticios realistas
- Preparado para migración: Arquitectura que se adapta a BD real de Agloval

**Stack:**
```
Frontend:   React 18 + TypeScript + Vite + Custom Hooks (no Context/Redux) + Tailwind
Backend:    Node.js/Express + TypeScript (Hexagonal pattern)
Database:   PostgreSQL + Prisma ORM
Testing:    Jest (backend) + Vitest + React Testing Library (frontend) + Cypress (e2e)
Deploy:     Vercel (frontend) + Render (backend)
```

---

## CARPETA STRUCTURE (MONOREPO)

```
agloval-custom-cutter/
│
├── frontend/                           # React app (port 3000, Vite)
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   │   └── CuttingCalculator.tsx   # Main (and only) page — product selection lives here too
│   │   ├── components/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── MeasurementForm.tsx
│   │   │   ├── PiecesList.tsx
│   │   │   ├── AreaVisualizer.tsx
│   │   │   ├── PriceDisplay.tsx
│   │   │   ├── CartPreview.tsx
│   │   │   ├── CalculationHistory.tsx
│   │   │   ├── HistoryItem.tsx
│   │   │   ├── ExportButton.tsx
│   │   │   ├── ShareModal.tsx
│   │   │   └── Alert.tsx
│   │   ├── services/
│   │   │   ├── api.ts                 # Axios instance (base URL to backend)
│   │   │   └── export.ts              # Export/share calculation as text/link
│   │   ├── hooks/                     # State management lives here — no Context/Redux
│   │   │   ├── useProducts.ts
│   │   │   ├── useCalculation.ts
│   │   │   ├── useCalculationHistory.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── utils/
│   │   │   └── formatters.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── styles/
│   │   │   └── globals.css             # Tailwind
│   │   ├── App.tsx
│   │   └── main.tsx                    # Vite entry point
│   ├── cypress/                        # E2E specs (4 suites)
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                            # Express app (port 5000)
│   ├── src/
│   │   ├── domain/                     # CORE LOGIC (zero dependencies)
│   │   │   ├── services/
│   │   │   │   └── CuttingCalculator.ts    # Lógica pura — área, tableros, waste%
│   │   │   ├── exceptions/
│   │   │   │   └── DomainException.ts      # Base + InvalidPieceException, EmptyPiecesListException, InvalidBoardDimensionsException, InsufficientBoardAreaException
│   │   │   └── types.ts                    # Piece, BoardDimensions, CalculationResult
│   │   │
│   │   ├── application/                # CASOS DE USO + PUERTOS
│   │   │   ├── ports/
│   │   │   │   ├── in/
│   │   │   │   │   ├── CalculateUseCase.ts
│   │   │   │   │   └── ProductUseCase.ts
│   │   │   │   └── out/
│   │   │   │       └── CalculationPersistence.ts   # IProductRepository, ICalculationRepository + record types
│   │   │   ├── services/
│   │   │   │   ├── CalculationApplicationService.ts
│   │   │   │   └── ProductUseCaseAdapter.ts        # thin pass-through, not a full app service yet
│   │   │   ├── validation/
│   │   │   │   └── CalculationSchemas.ts           # Zod schemas
│   │   │   ├── exceptions/
│   │   │   │   └── ApplicationException.ts         # ProductNotFoundException, CalculationNotFoundException, InvalidCalculationStatusException
│   │   │   └── dto/
│   │   │       ├── CalculationRequest.ts
│   │   │       └── CalculationResponse.ts
│   │   │
│   │   ├── infrastructure/             # ADAPTADORES (Express, Prisma) — no auth yet, see Known Limitations in README
│   │   │   ├── web/
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── BaseController.ts
│   │   │   │   │   ├── CalculationController.ts
│   │   │   │   │   └── ProductController.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── errorHandler.ts     # DomainException + Prisma error -> HTTP status
│   │   │   │   │   ├── validation.ts       # Zod-backed request validation
│   │   │   │   │   └── logging.ts
│   │   │   │   ├── routes/
│   │   │   │   │   ├── calculations.routes.ts
│   │   │   │   │   └── products.routes.ts
│   │   │   │   └── types/
│   │   │   │       └── express.d.ts        # Request augmentation (requestId, validatedBody, ...)
│   │   │   ├── persistence/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── ProductRepository.ts       # implements IProductRepository
│   │   │   │   │   └── CalculationRepository.ts   # implements ICalculationRepository
│   │   │   │   └── mappers/
│   │   │   │       ├── ProductMapper.ts
│   │   │   │       └── CalculationMapper.ts
│   │   │   └── config/
│   │   │       ├── express.ts          # App wiring: middleware, routes
│   │   │       └── database.ts         # Prisma client singleton, healthCheck()
│   │   │
│   │   └── server.ts                   # Entry point (run via `tsx`, not compiled dist/)
│   │
│   ├── test/                           # Mirrors src/ — 131 tests total
│   │
│   ├── prisma/
│   │   ├── schema.prisma               # DB schema
│   │   ├── seed.ts                     # 3 categories, 10 fictitious products
│   │   └── migrations/                 # Auto-generated by Prisma
│   │
│   ├── .env                            # Local dev env (gitignored)
│   ├── .env.example                    # Template
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── 2_CLAUDE_cutter.md              # This file — project constitution
│   ├── API.md                          # Endpoint reference
│   ├── ARCHITECTURE.md                 # Diagrams + rationale
│   ├── MIGRATION_GUIDE.md              # HOW TO SWITCH TO REAL BD (CRITICAL)
│   ├── DECISIONS.md                    # Why we chose X over Y
│   ├── DEPLOYMENT.md                   # Vercel + Render runbook
│   ├── TROUBLESHOOTING.md              # Common local-dev issues
│   └── ERD.md                          # Schema diagram
│
├── .github/workflows/test.yml          # CI: lint + backend + frontend tests
├── vercel.json                         # Frontend deploy config (not yet deployed)
├── render.yaml                         # Backend deploy config (not yet deployed)
├── docker-compose.yml                  # PostgreSQL + pgAdmin (local)
├── .gitignore
├── .env.example
├── package.json                        # Root: shells out to frontend/backend (no workspaces yet)
└── README.md                           # Quick start

```

---

## CORE PRINCIPLES

### 1. **Hexagonal Architecture**
- Domain = Core business logic (CuttingCalculator, PricingCalculator)
- Application = Use cases (services que usan puertos)
- Infrastructure = Express, Prisma, Express (adaptadores concretos)

**Dependency Rule:**
```
Controllers → Services (via ports/in) → Domain logic (pure) → 
Ports/out (interfaces) → Repositories (Prisma)
```

Domain NEVER imports Express, Prisma, or any external library.

### 2. **Backend Logic Only**
- Cálculos de área, pricing, validaciones = Backend only (domain service)
- Frontend solo pinta y valida entrada (no confía en cálculos del cliente)
- API siempre es fuente de verdad

### 3. **Database Flexibility**
- Schema pensado para migración a BD real de Agloval
- Prisma migrations versionadas desde día 1
- MIGRATION_GUIDE.md documentado early
- ETL scripts prep'd (no usados hoy, pero repo listo)

### 4. **Type Safety**
- Backend: TypeScript strict mode (`strict: true`)
- Frontend: React + TypeScript
- DTOs para API contracts (request/response siempre tipado)

### 5. **Testing First (Mindset)**
- Domain services testables sin DB/Express
- Integration tests cubren API completo
- E2E tests cubren critical user flows
- Target: >70% backend coverage, critical flows E2E

---

## CODE STYLE

### Naming
- **Classes:** PascalCase (CuttingCalculator, CalculationDTO)
- **Functions/Variables:** camelCase (calculateArea, boardsNeeded)
- **Constants:** UPPERCASE_SNAKE_CASE (MAX_BOARD_WIDTH)
- **Files:** 
  - Services: camelCase + Service suffix (cuttingCalculator.ts)
  - Classes/Types: PascalCase (CuttingCalculator.ts)
  - Tests: *.test.ts or *.spec.ts

### Method Length
- **Maximum 30 lines** per method
- If >30, extract to private helper
- Exception: Data mappers (can be longer)

### Comments
- English (variables, methods, classes)
- Explain WHY, not WHAT
- Domain logic should be self-documenting (good names > comments)

### Async/Await
- Always consistent: services return `Promise<T>`
- Controllers `await` service calls
- No mixing callbacks + promises
- Use `try/catch` for errors

---

## TESTING PATTERNS

### Unit Tests (Domain)
```typescript
describe('CuttingCalculator', () => {
  let calculator: CuttingCalculator;

  beforeEach(() => {
    calculator = new CuttingCalculator(300, 200); // board dimensions
  });

  it('should calculate boards needed for custom pieces', () => {
    const pieces = [
      { width: 200, height: 100 },
      { width: 200, height: 100 },
      { width: 250, height: 120 }
    ];

    const result = calculator.calculate(pieces);

    expect(result.boardsNeeded).toBe(1.2);
    expect(result.totalArea).toBe(0.96);
    expect(result.isValid).toBe(true);
  });

  it('should reject pieces exceeding board dimensions', () => {
    const pieces = [{ width: 400, height: 100 }]; // > board width
    expect(() => calculator.calculate(pieces)).toThrow(InvalidMeasurementException);
  });
});
```

### Integration Tests (API)
```typescript
describe('POST /api/calculations', () => {
  it('should create calculation and persist to DB', async () => {
    const request = {
      productId: 'prod_123',
      requestedPieces: [
        { width: 200, height: 100 }
      ]
    };

    const response = await request(app)
      .post('/api/calculations')
      .send(request)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.boardsNeeded).toBe(0.6);

    // Verify DB
    const saved = await prisma.calculation.findUnique({
      where: { id: response.body.id }
    });
    expect(saved).toBeDefined();
  });
});
```

### E2E Tests (Cypress)
```typescript
describe('Cutting Calculator - User Flow', () => {
  it('should complete full calculation workflow', () => {
    cy.visit('/');
    cy.get('[data-testid="product-list"]').should('be.visible');
    cy.get('[data-testid="product-card"]').first().click();
    
    cy.get('[data-testid="width-input"]').type('200');
    cy.get('[data-testid="height-input"]').type('100');
    cy.get('[data-testid="add-piece"]').click();
    
    cy.get('[data-testid="total-price"]').should('contain', '€');
    cy.get('[data-testid="submit-btn"]').click();
    
    cy.url().should('include', '/success');
  });
});
```

---

## DATABASE (Prisma)

### Schema Rules
- Relations: `@relation` always specified (no ambiguity)
- Indexes: `@@index` on frequently queried fields
- Timestamps: createdAt, updatedAt automatic
- Soft deletes: Not needed for MVP, but schema extensible

### Migrations
```bash
# After schema change
npx prisma migrate dev --name descriptive_name

# Never modify migrations manually
# Prisma generates SQL, you review it

# Deployment
npx prisma migrate deploy  # Applies pending migrations
```

### Seeding
```typescript
// prisma/seed.ts
// Inserts Agloval test data (real products, prices)
// Run after migrations:

npm run seed
```

---

## CONVENTIONAL COMMITS

Format: `<type>[scope]: <description>`

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `test`: Add/update tests
- `docs`: Documentation
- `chore`: Config, deps, build

### Scopes
```
(cutting-calc)   - Cutting calculator logic
(pricing)        - Pricing/discount logic
(api)            - API endpoints
(frontend)       - React components
(db)             - Prisma schema, migrations
(auth)           - JWT, authentication
(testing)        - Test infrastructure
(migration)      - BD real migration prep
(docs)           - Documentation
```

### Examples
```bash
feat(cutting-calc): implement area calculation with waste optimization
feat(frontend): add measurement form component
fix(api): fix precision error in decimal pricing
test(cutting-calc): add validation tests for edge cases
docs(migration): add guide for Agloval BD real integration
refactor(backend): extract pricing logic to value object
```

---

## COMMON COMMANDS

```bash
# Installation
npm install                      # Installs frontend + backend deps

# Development
npm run dev                      # Start frontend (3000) + backend (5000)
npm run dev:frontend
npm run dev:backend

# Database
npx prisma studio              # Visual DB browser
npx prisma migrate dev         # Run migrations
npm run seed                   # Seed test data

# Testing
npm test                       # All tests
npm run test:backend
npm run test:frontend
npm run test:e2e              # Cypress
npm run coverage              # Coverage report

# Building
npm run build                 # Build both
npm run build:frontend
npm run build:backend

# Docker
docker-compose up             # Start PostgreSQL
docker-compose down

# Deployment
npm run deploy:frontend       # Vercel
npm run deploy:backend        # Render
```

---

## ENVIRONMENT VARIABLES

### backend/.env
```
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/agloval_cutting_dev"
CORS_ORIGIN="http://localhost:3000"
LOG_LEVEL="debug"
```
Note: no `JWT_SECRET` — auth doesn't exist yet (`jsonwebtoken` isn't even a dependency), see Known Limitations in the root README.

### frontend/.env
```
VITE_API_URL=http://localhost:5000
```
Vite only exposes env vars prefixed `VITE_` to client code — `REACT_APP_*` naming (Create React App convention) does not work here.

**Never commit .env files.** Use .env.example as template.

---

## WHEN YOU'RE STUCK

1. **Architecture question:** Read `docs/ARCHITECTURE.md`
2. **API design:** Check `docs/API.md`
3. **Migration concern:** Read `docs/MIGRATION_GUIDE.md` (CRITICAL)
4. **Code example:** Look at tests in `backend/test/`
5. **Setup issue:** Check `docs/TROUBLESHOOTING.md` (full reference) or the short version in the root README
6. **Design decision:** Read `docs/DECISIONS.md`

---

## SESSION STRUCTURE

**Each Claude Code session:**

1. **Session Start:**
   ```
   Modo: PROYECTO
   Tema: Agloval Custom Cutter - [Phase X - Feature]
   Contexto: [what you completed, where you are]
   Pregunta: [specific need today]
   ```

2. **`docs/2_CLAUDE_cutter.md` auto-injected** (this file)

3. **Work on feature**

4. **Before /clear:**
   ```
   git add .
   git commit -m "feat(...): description"
   ```

5. **Session end:**
   ```
   /clear
   ```
   (Context resets, CLAUDE.md re-injected next session)

---

## CRITICAL PATH (Don't miss)

**Must do correctly:**
- Domain services are pure (zero dependencies)
- API contracts (DTOs) are stable
- Database schema is flexible (migration-ready)
- Core business logic is tested (>70% coverage)
- Documentation exists from day 1 (especially MIGRATION_GUIDE)
- Commits are semantic (portfolio-visible)
- Frontend validates but doesn't trust own validation (backend is truth)

---

## TROUBLESHOOTING

### "Port 5000 already in use"
```bash
lsof -i :5000
kill -9 <PID>
# OR use different port in .env
```

### "Prisma client not found"
```bash
npx prisma generate
npm install @prisma/client
```

### "Database connection refused"
```bash
docker-compose up -d  # Start PostgreSQL
npx prisma migrate dev  # Run migrations
npm run seed  # Seed data
```

### "Frontend can't reach backend"
- Check CORS_ORIGIN in backend/.env
- Check VITE_API_URL in frontend/.env
- Ensure backend is running on correct port

Full reference: `docs/TROUBLESHOOTING.md`.

---

## PHASES (Structural breakdown)

**Phase A:** Setup + Domain — **Done, tagged `v0.1.0`**
- Project scaffold (monorepo)
- Prisma schema
- CuttingCalculator service
- Initial tests

**Phase B:** Backend API — **Done, tagged `v0.2.0`**
- Express controllers, routes, middleware
- Real Prisma repositories + mappers
- Full calculation CRUD (create/get/list/update/delete)
- Error handling (`DomainException` + Prisma error translation)
- `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/MIGRATION_GUIDE.md`, `docs/DECISIONS.md`
- 131 tests (unit + HTTP integration + DB integration)
- Auth intentionally out of scope — see Known Limitations in the root README

**Phase C:** Frontend + Integration — **Done, tagged `v0.3.0`**
- React components + custom hooks (no Context/Redux — see Design Decisions)
- API integration (Axios client)
- localStorage-backed calculation history
- Export/share UI
- Cypress E2E suite (4 specs)

**Phase D:** Documentation + Deployment config — **Done, tagged `v1.0.0`**
- Closed the Phase C documentation gap (CHANGELOG, README, this file)
- Added missing docs: `DEPLOYMENT.md`, `TROUBLESHOOTING.md`, `ERD.md`
- CI (GitHub Actions: lint + test, no deploy job yet)
- `vercel.json` / `render.yaml` config scaffolds — no live deploy attempted this phase
- Tagged `v1.0.0`, not `v0.4.0` — the project's own README Roadmap had already declared v1.0 as "current target" with 5 criteria (calc engine, API, DB persistence, testing, React UI), all satisfied once Phase C shipped. Live deployment and auth remain out of scope, moved to the v1.1+ roadmap.

---

**¿Preguntas? Vuelve a este archivo.**

**Construyamos algo que Ferran quiera integrar en producción.**
