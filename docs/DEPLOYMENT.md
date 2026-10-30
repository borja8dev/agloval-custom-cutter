# Deployment Runbook

**Status: not yet deployed.** This is the runbook for standing the app up on Vercel (frontend) + Render (backend) — `vercel.json` and `render.yaml` at the repo root are the config scaffolds for it. Nothing here has been executed against a live account yet; wherever a URL is needed, it's a placeholder you fill in once the real service exists (`<your-backend>`, `<your-frontend>`, etc.), not a real address.

---

## Overview

| Piece | Host | Root directory | Notes |
|-------|------|-----------------|-------|
| Frontend | Vercel | `frontend/` | Static build, Vite output (`dist/`) |
| Backend | Render | `backend/` | Node web service, runs via `tsx` (see `docs/DECISIONS.md`) |
| Database | Render Postgres (or any managed Postgres) | — | `DATABASE_URL` is the only thing the backend needs to know about it |

Both platforms auto-deploy on push to `main` once the project is connected through their dashboard — there's no separate "deploy command" to run manually after initial setup.

---

## 1. Backend (Render)

1. Push this repo to GitHub (already done).
2. In the Render dashboard: **New → Web Service**, connect the repo.
3. Root directory: `backend`
4. Build command: `npm install && npx prisma generate && npm run build`
5. Start command: `npm start` (runs `tsx src/server.ts` — see `docs/DECISIONS.md` for why this project runs TS directly instead of compiled `dist/`)
6. Environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<from the Render Postgres instance you create in step 7>
   CORS_ORIGIN=https://<your-frontend>.vercel.app
   ```
   Render injects `PORT` itself — the app already reads `process.env.PORT` (see `backend/src/server.ts`), no need to set it manually.
   Note: no `JWT_SECRET` — there's no auth in this codebase yet (see Known Limitations in the root README), so don't invent one.

   Order emails (`POST /api/orders/submit`), all optional and set by hand in the dashboard (`sync: false` in `render.yaml`):

   | Variable | Default | Purpose |
   |----------|---------|---------|
   | `SMTP_HOST` | unset | SMTP server. Unset: emails are not sent, only logged (recipient domain and subject). |
   | `SMTP_PORT` | `1025` | SMTP port (usually `587`, or `465` with `SMTP_SECURE=true`). |
   | `SMTP_SECURE` | not `true` | `true` for TLS from the start (port 465); anything else uses STARTTLS when offered. |
   | `SMTP_USER` / `SMTP_PASS` | unset | SMTP credentials; used only when both are set. |
   | `MAIL_FROM` | `Agloval · Gestor de pedidos <no-reply@agloval.test>` | Sender. Use an address on a domain the SMTP provider is allowed to send for. |
   | `ORDER_NOTIFICATION_EMAIL` | unset | Where Agloval receives new orders. |

   **Leave `ORDER_NOTIFICATION_EMAIL` unset until Agloval decides which address should receive orders.** While it is unset, only the customer gets an email and the response reports `"agloval": "skipped"`. In production `NODE_ENV=production` also makes Express trust one proxy hop, so the per-IP submission limit sees the real client IP behind Render's proxy.
7. Add a Render Postgres database (**New → PostgreSQL**), copy its **Internal Database URL** into `DATABASE_URL` above.
8. Run the initial migration once the service and database both exist. Render's one-off **Shell** (from the service page) or a **Pre-Deploy Command** both work:
   ```bash
   npx prisma migrate deploy
   ```
   Do not run `prisma migrate dev` in production — `dev` can prompt interactively and is meant for local schema iteration; `deploy` only applies already-committed migrations.
9. Optionally seed reference data the same way (`npm run seed`) — only makes sense before real Agloval data replaces it (see `docs/MIGRATION_GUIDE.md`).

---

## 2. Frontend (Vercel)

1. In the Vercel dashboard: **Add New → Project**, import the repo.
2. Leave the project's Root Directory at the repo root (do **not** set it to `frontend`) — the root `vercel.json` already declares `buildCommand` (`cd frontend && npm install && npm run build`) and `outputDirectory` (`frontend/dist`) relative to the repo root. Setting a dashboard Root Directory too would double up the path and break the build.

   It also declares an SPA rewrite (`"source": "/(.*)"` → `/index.html`), so client routes such as `/presupuestos` and `/pedidos` load the app when opened directly or reloaded instead of returning a 404. Real files in `dist/` (scripts, styles, the logo) are still served as they are. The rewrite is safe because the API lives on Render under its own domain, not on this Vercel deployment.
3. Environment variable:
   ```
   VITE_API_URL=https://<your-backend>.onrender.com
   ```
   Vite only exposes vars prefixed `VITE_` to client code (see `docs/2_CLAUDE_cutter.md`) — anything named `REACT_APP_*` would silently do nothing here.
4. Deploy. Vercel gives you a `*.vercel.app` URL — that becomes the real value for `CORS_ORIGIN` on the backend (step 6 in the Backend section above), so backend and frontend configs are circular on first setup: deploy backend first with a placeholder `CORS_ORIGIN`, get the real frontend URL, then update the backend env var and redeploy.

---

## 3. Post-deploy validation

```bash
# Backend health check
curl https://<your-backend>.onrender.com/health

# Frontend loads
curl -I https://<your-frontend>.vercel.app

# SPA routes are rewritten to the app (expect 200, not 404)
curl -I https://<your-frontend>.vercel.app/pedidos
```

Then, manually: open the frontend, pick a product, add pieces, confirm a calculation returns a price and CORS doesn't block the request (check the browser console).

---

## 4. Rollback

Both platforms redeploy from git history — there's no manual server state to restore:

```bash
git revert <commit-hash>
git push origin main
```

Vercel/Render pick up the new push and redeploy automatically.

---

## Notes

- Pricing/free-tier limits for Vercel and Render change over time — check their current pricing pages rather than trusting a number written here.
- There is no CI deploy job (see `.github/workflows/test.yml`) — CI only runs lint + tests. Auto-deploy is handled entirely by Vercel/Render watching the connected branch, not by GitHub Actions.
- See `docs/MIGRATION_GUIDE.md` for what changes (nothing, ideally) when `DATABASE_URL` eventually points at Agloval's real database instead of this project's own Postgres instance.
