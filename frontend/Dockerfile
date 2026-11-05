# Frontend image for the local stack (docker-compose.local.yml).
# Not used by Vercel: production builds the frontend directly (vercel.json).
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Cypress is a devDependency; its binary is only needed for e2e tests.
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Baked into the bundle at build time. nginx serves the app and proxies /api on this origin.
ARG VITE_API_URL=http://localhost:8580
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
