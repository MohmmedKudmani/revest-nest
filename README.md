# Revest NestJS Microservices

A two-service NestJS backend for a retail platform. Each service owns its own SQLite database and runs independently. The services communicate internally over TCP — never over HTTP.

## Architecture

```
HTTP Client
    │
    ├── GET/POST /products  →  Product Service  :3001  (HTTP)
    │                                           :3100  (TCP, internal only)
    │
    └── GET/POST /orders    →  Order Service    :3002  (HTTP)
                                    │
                                    └── TCP { cmd: 'get_product' }  →  Product Service :3100
```

| Service | HTTP | Swagger | DB |
|---|---|---|---|
| product-service | `:3001` | `http://localhost:3001/api/docs` | `apps/product-service/src/db/prisma/dev.db` |
| order-service | `:3002` | `http://localhost:3002/api/docs` | `apps/order-service/src/db/prisma/dev.db` |

## Prerequisites

**Dev:** Node 22, pnpm  
**Prod:** Docker + Docker Compose (no local Node needed)

## Environment

Each service has its own `.env` file. These are already in the repo for dev — no setup needed.

**`apps/product-service/.env`**
```env
DATABASE_URL="file:./dev.db"
```

**`apps/order-service/.env`**
```env
DATABASE_URL="file:./dev.db"
PRODUCT_SERVICE_HOST=localhost
PRODUCT_SERVICE_TCP_PORT=3100
```

> **Prod:** environment is injected by `docker-compose.yml` automatically — no `.env` files needed.

---

## Dev

```bash
# 1. Install dependencies
pnpm install

# 2. Run migrations (first time only)
pnpm run db:migrate

# 3. Seed products
pnpm run db:seed

# 4. Start both services in watch mode
pnpm run dev
```

`db:seed` is idempotent — safe to run multiple times, skips if data already exists.

---

## Prod (Docker)

```bash
# Build images and start both services
docker compose up --build -d

# Seed products (run once, after containers are up)
pnpm run db:prod:seed

# Tail logs
docker compose logs -f

# Stop
docker compose down

# Stop and wipe all data
docker compose down -v
```

Migrations run automatically on container start. Data persists in Docker named volumes (`product_data`, `order_data`).

---

## API Docs

Once the services are running, open Swagger in your browser:

| Service | URL |
|---|---|
| Product Service | `http://localhost:3001/api/docs` |
| Order Service | `http://localhost:3002/api/docs` |

---

## Seeding

| Command | Target | When to run |
|---|---|---|
| `pnpm run db:seed` | Local dev DB | After first `migrate dev` |
| `pnpm run db:prod:seed` | Docker container DB | Once, after `docker compose up` |

---

## Scripts

| Command | Description |
|---|---|
| `pnpm run db:migrate` | Run Prisma migrations for both services |
| `pnpm run dev` | Both services in watch mode |
| `pnpm run build` | Compile both services |
| `pnpm run start:prod` | Run compiled output (no Docker) |
| `pnpm run lint` | Lint and auto-fix |
| `pnpm run format` | Prettier format |
| `pnpm run test` | Run unit tests |

---

## Project Layout

```
apps/
  product-service/     # HTTP :3001 + TCP :3100, manages products
  order-service/       # HTTP :3002, manages orders
scripts/
  seed.ts              # Seeds 20 products into product-service DB
Dockerfile             # Multi-stage build for both services
docker-compose.yml     # Runs product-service + order-service
docker-entrypoint.sh   # Runs prisma migrate deploy then starts the service
```
