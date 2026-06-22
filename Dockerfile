# ── build stage ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Enable pnpm via corepack (matches the host package manager)
RUN corepack enable

# Install deps first — this layer is cached until lockfile changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source (node_modules and generated dirs are excluded by .dockerignore)
COPY . .

# Generate both Prisma clients (bundled by webpack) then build both apps
RUN cd apps/product-service/src/db && pnpm exec prisma generate \
 && cd /app/apps/order-service/src/db && pnpm exec prisma generate \
 && cd /app && pnpm run build

# Prune dev deps — the runtime image inherits this node_modules
RUN pnpm prune --prod

# ── runtime stage ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Non-root user
RUN groupadd -r app && useradd -r -g app app

# Production node_modules (includes better-sqlite3, prisma CLI — both runtime deps)
COPY --from=build --chown=app:app /app/node_modules ./node_modules

# Compiled bundles
COPY --from=build --chown=app:app /app/dist ./dist

# Prisma schema + migrations needed for `migrate deploy` at container startup
COPY --from=build --chown=app:app /app/apps ./apps

# Entrypoint: runs migrations then starts the requested service
COPY --chown=app:app docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Volume mount point for SQLite data
RUN mkdir -p /data && chown app:app /data

USER app

ENTRYPOINT ["./docker-entrypoint.sh"]
