# Backend image for the local stack (docker-compose.local.yml).
# Not used by Render: production installs and runs the backend directly.
FROM node:20-bookworm-slim

# openssl: Prisma's query engine. postgresql-client: psql and pg_dump for the entrypoint
# (Debian bookworm ships client 15, matching the postgres:15 server).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The server and the catalog importer run through tsx, a devDependency, so install everything.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && chmod +x docker/entrypoint.sh

ENV NODE_ENV=production \
    PORT=5000
EXPOSE 5000

CMD ["./docker/entrypoint.sh"]
