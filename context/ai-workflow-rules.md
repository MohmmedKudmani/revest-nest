# AI Workflow Rules

## Approach

Build incrementally. One feature unit at a time. Verify each unit works before moving to the next. Do not combine unrelated changes in one step.

## Package Manager

Use `pnpm` for this project. Do not use `npm`, `yarn`, or `bun`.

## Implementation Order

Always follow this sequence for any new feature:

1. Schema change (if needed) — update `prisma/schema.prisma`, run `npx prisma migrate dev`
2. DTO/Schema — define input shape in `feature.schema.ts` using Zod + `createZodDto`
3. Service — implement business logic with Prisma calls
4. Controller — wire HTTP routes and/or TCP message patterns
5. Module — register all providers, imports, controllers
6. Document — only when explicitly asked; see Documentation Rules below
7. Verify — test the endpoint manually before marking done

## Scoping Rules

- Work on one service at a time — finish Product Service before starting Order Service
- One feature unit = one controller method + its service method + its DTO
- Do not combine schema changes and business logic changes in one step

## When to Split Work

Split if the step combines:

- Schema change AND service logic change
- Multiple unrelated controller methods
- Product Service work AND Order Service work simultaneously

## Service Build Order

1. Product Service — fully working (HTTP + TCP + Swagger + Prisma)
2. Order Service — fully working (HTTP + TCP client + Swagger + Prisma)
3. Docker Compose — bonus, do last

Rationale: Order Service depends on Product Service's TCP patterns being stable. Build and verify Product first.

## Running Each Service

```bash
# From repo root
pnpm run dev                                                         # watch mode, both services
pnpm exec nest start product-service --watch                        # single service

# Inside apps/product-service/ or apps/order-service/
pnpm exec prisma migrate dev --name init --config src/db/prisma.config.ts   # first time only
pnpm exec prisma generate --config src/db/prisma.config.ts                  # after schema changes
pnpm exec prisma studio --config src/db/prisma.config.ts                    # inspect DB in browser
```

## Verifying TCP Communication

After both services are running, verify TCP works by:

1. Creating a product via `POST /products`
2. Creating an order with that product's ID via `POST /orders`
3. Confirming the order response includes the enriched `product` object
4. Confirming the product was fetched via TCP (not HTTP)

## Handling Missing Requirements

- Do not invent behavior not defined in `architecture.md` or `project-overview.md`
- If a requirement is ambiguous, clarify with the user before implementing

## Documentation Rules

**Only add comments when the user explicitly asks.** Do not add comments while writing or editing code — it wastes tokens and adds noise. When asked, add a comment when the **why** is not obvious from the code itself. Do not comment what the code does — comment why it does it that way.

Comment these situations:
- A constraint or invariant that isn't visible in the types (e.g. "TCP and HTTP cannot share a port")
- A workaround for a library limitation (e.g. "Prisma 7 requires a driver adapter for SQLite")
- A deliberate trade-off or design decision (e.g. "totalPrice is locked at creation so it survives product price changes")
- Non-obvious fallback or short-circuit behaviour (e.g. "returns empty page immediately to avoid a useless DB query")
- Environment-specific defaults (e.g. "DATABASE_URL fallback keeps local pnpm dev working without extra setup")

Do NOT comment:
- What a function does when the name already says it (e.g. `// creates a product`)
- Standard NestJS/Prisma boilerplate that any developer in this stack would recognise
- Temporary state or task context — those belong in commit messages, not code

Keep comments short: one or two lines max. If it takes more than two lines to explain the why, consider whether the code itself should be restructured.

## TypeScript Error Policy

**Never run `pnpm run build` until all TypeScript and ESLint errors are resolved first.**

Workflow order:

1. Write or edit code
2. Invoke the `nestjs-best-practices` skill to cross-check patterns before finalising any NestJS code
3. Read through every file changed and confirm there are no TypeScript errors visible (type mismatches, implicit `any`, unnecessary assertions, missing types)
4. Resolve all ESLint TypeScript errors — especially `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-return`, `no-unnecessary-type-assertion`
5. Only then run `pnpm run build` as a final gate

Rules:

- Never use `any` implicitly — if a third-party API returns `any` (e.g. `ClientProxy.send()`), always type it explicitly with a generic: `firstValueFrom<MyType>(...)`
- Never add type assertions (`as X`) unless TypeScript cannot infer the type on its own — if ESLint flags it as unnecessary, remove it
- All types come from `src/schemas/` — never import entity types from `src/db/generated/`

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope
2. No invariant from `architecture.md` was violated
3. `pnpm run build` passes and all TypeScript/ESLint errors are resolved

## Protected Patterns

Do not change these unless explicitly instructed:

- The TCP transport type — keep it TCP, do not switch to Redis or RabbitMQ
- The `firstValueFrom()` pattern for TCP calls — do not use `.subscribe()` or `.toPromise()`
- SQLite as the database — do not switch to PostgreSQL
- The hybrid app pattern in Product Service `main.ts`
