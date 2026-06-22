# Code Standards

## General

- One responsibility per file — controllers handle HTTP/TCP routing, services handle business logic, Prisma service handles DB
- No business logic inside controllers — delegate everything to the service
- No direct Prisma calls inside controllers — always go through the service
- Fix root causes, do not layer workarounds
- Prefer explicit names over clever abstractions

## TypeScript

- Strict mode throughout (`"strict": true` in tsconfig)
- No `any` — use explicit types or interfaces
- Validate all external input with Zod schemas at the controller boundary
- Define shared types explicitly — do not duplicate across files

## NestJS Modules

- One module per feature: `products`, `orders`
- Each module owns its controller, service, schema file, and module definition
- `PrismaService` lives in `src/prisma/prisma.service.ts` inside each service — it is not shared across services
- Register `PrismaService` as a provider in `AppModule` or the feature module, not both
- `ClientsModule.register()` belongs in the feature module that uses it (`OrdersModule`), not in `AppModule`

## Controllers

### HTTP Controllers

```typescript
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto)
  }
}
```

### TCP Message Handlers (Product Service only)

```typescript
@MessagePattern({ cmd: 'get_product' })
getProductTCP(id: string) {
  return this.productsService.findOne(id);
}
```

- HTTP handlers and TCP handlers live in the same controller file
- HTTP handlers use `@Get()`, `@Post()`, `@Patch()`, `@Delete()`, `@Param()`, `@Body()`
- TCP handlers use `@MessagePattern({ cmd: '...' })` — no HTTP decorators
- TCP handlers in Order Service do not exist — it is HTTP only on the controller side

## Schemas

Every feature has a single `feature.schema.ts` file colocated with the feature. No `dto/` folder. No `class-validator`. No `@ApiProperty` decorators.

`nestjs-zod` handles validation and Swagger automatically from the Zod schema.

### Install

```bash
npm install nestjs-zod zod
```

### Schema file pattern — `product.schema.ts`

```typescript
import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

// ── Schemas ─────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
})

export const UpdateProductSchema = CreateProductSchema.partial()

// ── DTOs (NestJS classes from Zod schemas) ───────────────

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}

// ── Types (use in service method signatures) ─────────────

export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
```

### Order schema — `order.schema.ts`

```typescript
import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

export const CreateOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
})

export const UpdateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
})

export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}
export class UpdateOrderDto extends createZodDto(UpdateOrderSchema) {}

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>
```

### Rules

- One schema file per feature — `product.schema.ts`, `order.schema.ts`
- All Zod schemas, DTOs, and types live in that one file
- `UpdateSchema` is always `.partial()` of `CreateSchema` except for Order status (separate schema)
- Use `z.enum()` for status — cleaner than `@IsIn()` and SQLite-compatible
- Import `CreateProductDto` / `UpdateProductDto` in the controller exactly as before — nothing changes there
- Use the `Input` types in service method signatures: `create(data: CreateProductInput)`

## Prisma Service

**Prisma 7 — driver-adapter pattern** (used by both services).
The client is generated into `src/db/generated/` (gitignored) — run `pnpm exec prisma generate --config src/db/prisma.config.ts` (from the service root) after any schema change.

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { join } from 'node:path'
import { PrismaClient } from './generated/client' // generated output path (src/db/generated/)
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Absolute path anchored to repo root so CLI and runtime agree on the same DB file.
const dbUrl = `file:${join(process.cwd(), 'apps/<service-name>/src/db/prisma/dev.db')}`

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: new PrismaBetterSqlite3({ url: dbUrl }) })
  }
  async onModuleInit() {
    await this.$connect()
  }
  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

Schema generator block (`src/db/prisma/schema.prisma`):

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../generated"
  moduleFormat        = "cjs"
  runtime             = "nodejs"
  importFileExtension = ""
}

datasource db {
  provider = "sqlite"
}
```

Connection URL lives in `src/db/prisma.config.ts` (Prisma 7 requirement):

```typescript
import { defineConfig } from 'prisma/config'
export default defineConfig({
  schema: 'prisma/schema.prisma', // → src/db/prisma/schema.prisma
  datasource: { url: 'file:./prisma/dev.db' }, // → src/db/prisma/dev.db
})
```

Do not copy-paste Prisma query logic into controllers. Keep all `this.prisma.*` calls inside the service.

## TCP Client in Order Service

Injecting and using the TCP client:

```typescript
// In OrdersModule
ClientsModule.register([{
  name: 'PRODUCT_SERVICE',
  transport: Transport.TCP,
  options: {
    host: process.env.PRODUCT_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.PRODUCT_SERVICE_TCP_PORT || '3001'),
  },
}])

// In OrdersService
constructor(
  private prisma: PrismaService,
  @Inject('PRODUCT_SERVICE') private productClient: ClientProxy,
) {}

// Calling it — always use firstValueFrom
const product = await firstValueFrom(
  this.productClient.send({ cmd: 'get_product' }, productId)
);
```

- Always `await firstValueFrom(this.productClient.send(...))` — never subscribe manually
- Import `firstValueFrom` from `rxjs`
- Wrap in try/catch or `.catch(() => null)` when product deletion is a valid scenario (e.g. enriching order list)
- Throw `NotFoundException` when a product is required but not found

## Error Handling

Use NestJS built-in exceptions — do not invent custom error classes for this assignment:

```typescript
throw new NotFoundException(`Product ${id} not found`)
throw new BadRequestException('Invalid status value')
```

NestJS maps these to correct HTTP status codes automatically. Do not catch and re-throw NestJS exceptions — let the global exception filter handle them.

## Swagger

Set up in `main.ts` of each service. `nestjs-zod` patches Swagger automatically — no `@ApiProperty` decorators needed anywhere.

```typescript
import { patchNestJsSwagger } from 'nestjs-zod'

// Call this BEFORE SwaggerModule.createDocument()
patchNestJsSwagger()

const config = new DocumentBuilder()
  .setTitle('Product Service')
  .setDescription('CRUD API for retail products')
  .setVersion('1.0')
  .build()
const document = SwaggerModule.createDocument(app, config)
SwaggerModule.setup('api/docs', app, document)
```

Swagger infers all request body schemas directly from the Zod schemas. Nothing else needed.

## Validation Pipe

Register globally in `main.ts` — replaces NestJS's built-in `ValidationPipe`:

```typescript
import { ZodValidationPipe } from 'nestjs-zod'

app.useGlobalPipes(new ZodValidationPipe())
```

Do not use `ValidationPipe` from `@nestjs/common` — `ZodValidationPipe` replaces it entirely.

## Naming Conventions

| Thing           | Convention                | Example                  |
| --------------- | ------------------------- | ------------------------ |
| Module file     | `feature.module.ts`       | `products.module.ts`     |
| Controller      | `feature.controller.ts`   | `products.controller.ts` |
| Service         | `feature.service.ts`      | `products.service.ts`    |
| Schema file     | `feature.schema.ts`       | `product.schema.ts`      |
| Zod schema      | `VerbFeatureSchema`       | `CreateProductSchema`    |
| DTO class       | `VerbFeatureDto`          | `CreateProductDto`       |
| Type            | `VerbFeatureInput`        | `CreateProductInput`     |
| TCP pattern     | `{ cmd: 'verb_noun' }`    | `{ cmd: 'get_product' }` |
| Injection token | `'SERVICE_NAME'` all caps | `'PRODUCT_SERVICE'`      |

## File Organization

```
src/
├── feature/
│   ├── feature.schema.ts    ← Zod schemas, DTOs, and Input types
│   ├── feature.module.ts
│   ├── feature.controller.ts
│   └── feature.service.ts
├── prisma/
│   └── prisma.service.ts
├── app.module.ts
└── main.ts
```

No `dto/` folder. No `entities/` folder. One schema file per feature, everything in it.
