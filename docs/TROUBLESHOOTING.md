# Troubleshooting

Common local-development issues and how to fix them. For production deploy issues, see `docs/DEPLOYMENT.md`.

---

### "Port 5000 already in use" (backend) / "Port 3000 already in use" (frontend)

```bash
lsof -i :5000   # or :3000
kill -9 <PID>
```

Or override the port: set `PORT` in `backend/.env`, or let Vite pick another port automatically (it does, via `strictPort: false` in `frontend/vite.config.ts`) and update `VITE_API_URL`/`CORS_ORIGIN` to match.

---

### "Database connection refused"

Postgres isn't running, or isn't reachable at the URL in `backend/.env`.

```bash
docker-compose up -d       # starts postgres + pgAdmin
npx prisma migrate dev     # from backend/
npm run seed                # from backend/
```

If Docker's Postgres port (`5432`) conflicts with a Postgres already installed locally, either stop the local one or remap the port in `docker-compose.yml` and update `DATABASE_URL` in `backend/.env` to match.

---

### "Prisma Client not found" / types out of sync after a schema change

Prisma Client is generated code — it doesn't auto-update just because `schema.prisma` changed.

```bash
npx prisma generate       # regenerate the client from the current schema
npx prisma migrate dev    # if you also need a new migration
```

---

### "Frontend can't reach backend" / CORS errors in the browser console

- Check `VITE_API_URL` in `frontend/.env` — Vite only exposes vars prefixed `VITE_`; `REACT_APP_*` (Create React App naming) does nothing here.
- Check `CORS_ORIGIN` in `backend/.env` matches the frontend's actual origin (`http://localhost:3000` locally).
- Confirm the backend is actually running: `curl http://localhost:5000/health`.

---

### Backend integration tests fail / hang

Backend tests include `supertest` HTTP integration tests and repository tests against a **real Postgres instance** (not mocked) — they need `docker-compose up -d` running first, with migrations applied. If tests hang instead of failing fast, it's usually Postgres not being reachable at `DATABASE_URL`.

---

### Cypress tests are flaky or time out on first run

Cypress E2E tests expect both dev servers already running and warmed up:

```bash
npm run dev              # from repo root — starts both frontend (3000) and backend (5000)
# then, in another terminal:
cd frontend && npm run test:e2e:headless
```

Running Cypress against a cold `npm run dev` (still compiling/hot-reloading) is the most common source of flaky first-run failures — give it a few seconds after `npm run dev` before starting Cypress. Note `npm run test:e2e` opens Cypress's interactive GUI (`cypress open`); use `test:e2e:headless` (`cypress run`) for non-interactive/CI-style runs.

---

### "Module not found" after pulling new changes

Root `package.json` doesn't use npm workspaces — `frontend/` and `backend/` have independent `node_modules`. After pulling changes that touch dependencies, reinstall both:

```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```
