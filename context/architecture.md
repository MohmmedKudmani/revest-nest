# Architecture

## System Diagram

```
HTTP Client
    │
    ├── HTTP GET/POST → Product Service (:3001)
    │
    └── HTTP GET/POST → Order Service (:3002)
                            │
                            └── TCP { cmd: 'get_product' } → Product Service TCP (:3001)
```

Services never call each other over HTTP. Order Service calls Product Service exclusively via TCP.

## Service Boundaries

### Product Service
```
product-service/
├── src/
│   ├── products/
│   │   ├── product.schema.ts        ← Zod schemas, DTOs, Input types
│   │   ├── products.module.ts
│   │   ├── products.controller.ts   ← HTTP + @MessagePattern handlers
│   │   └── products.service.ts      ← business logic + Prisma calls
│   ├── prisma/
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts                      ← hybrid: HTTP + TCP listener
├── prisma/
│   └── schema.prisma
└── .env
```

### Order Service
```
order-service/
├── src/
│   ├── orders/
│   │   ├── order.schema.ts          ← Zod schemas, DTOs, Input types
│   │   ├── orders.module.ts         ← registers ClientsModule for PRODUCT_SERVICE
│   │   ├── orders.controller.ts     ← HTTP handlers only
│   │   └── orders.service.ts        ← business logic + Prisma + TCP client calls
│   ├── prisma/
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts                      ← standard HTTP app only
├── prisma/
│   └── schema.prisma
└── .env
```

## Communication Patterns

### HTTP (external)
Standard REST. Both services expose HTTP on their respective ports.

### TCP (internal — order-service to product-service)
NestJS microservices transport. Used only for order-service to call product-service.

Message patterns:
- `{ cmd: 'get_product' }` — payload: `productId: string` → returns Product or throws
- `{ cmd: 'get_all_products' }` — payload: none → returns Product[]

Order Service injects `ClientProxy` via `@Inject('PRODUCT_SERVICE')` and calls `.send()`. Always wrap `.send()` in `firstValueFrom()` from `rxjs`.

## Database Model

Each service has its own SQLite file. They never share tables or query each other's database directly.

### Product Service — `prisma/schema.prisma`
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // "file:./dev.db"
}

model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  price       Float
  stock       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Order Service — `prisma/schema.prisma`
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // "file:./dev.db"
}

model Order {
  id         String   @id @default(uuid())
  productId  String   // soft reference — no DB-level FK
  quantity   Int
  totalPrice Float    // price snapshot at order creation time
  status     String   @default("PENDING")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

`productId` is a plain string — no DB-level foreign key because the product lives in a different service's database. Cross-service data is resolved at runtime via TCP.

`status` is a String (not enum) because SQLite has no native enum type. Allowed values: `PENDING`, `CONFIRMED`, `CANCELLED`. Enforce in DTO with `@IsIn()`.

`totalPrice` is stored at order creation time as a snapshot of `product.price × quantity`. It does not update if the product price changes later.

## main.ts Patterns

### Product Service — Hybrid App
```typescript
const app = await NestFactory.create(AppModule);
app.connectMicroservice({ transport: Transport.TCP, options: { host: '0.0.0.0', port: 3001 } });
await app.startAllMicroservices();
await app.listen(3001);
```

### Order Service — Standard HTTP
```typescript
const app = await NestFactory.create(AppModule);
await app.listen(3002);
```

## Invariants

These must never be violated:
1. Services never share a database file
2. Order Service never calls Product Service via HTTP
3. `totalPrice` is always computed and stored at order creation — never computed on read
5. Each service runs its own Prisma migration independently
6. No shared code or shared modules between services — copy `PrismaService` into each
