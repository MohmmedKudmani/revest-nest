#!/bin/sh
set -e

SERVICE="$1" # product-service | order-service

# Run migrations against the volume-backed DB (DATABASE_URL=file:/data/dev.db)
( cd "/app/apps/${SERVICE}/src/db" && /app/node_modules/.bin/prisma migrate deploy )

exec node "/app/dist/apps/${SERVICE}/main.js"
