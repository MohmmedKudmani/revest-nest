# API Context

## Services

| Service | Port | Swagger |
|---|---|---|
| Product Service | 3001 | `http://localhost:3001/api/docs` |
| Order Service | 3002 | `http://localhost:3002/api/docs` |

## Response Shape

NestJS returns data directly (no envelope wrapper). Errors use NestJS built-in exception shape:

```json
// Success — returns the object or array directly
{ "id": "uuid", "name": "...", ... }

// Error
{ "statusCode": 404, "message": "Product uuid not found", "error": "Not Found" }

// Validation error
{ "statusCode": 400, "message": ["name should not be empty"], "error": "Bad Request" }
```

---

## Product Service — `http://localhost:3001`

### `POST /products`
**Body:**
```json
{
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse",
  "price": 29.99,
  "stock": 100
}
```
**Response 201:** Full product object.

---

### `GET /products`
**Response 200:** Array of product objects.

---

### `GET /products/:id`
**Response 200:** Single product object.
**Response 404:** `Product {id} not found`

---

### `PATCH /products/:id`
**Body:** Any subset of product fields (all optional).
**Response 200:** Updated product object.

---

### `DELETE /products/:id`
**Response 200:** Deleted product object.

---

## Order Service — `http://localhost:3002`

### `POST /orders`
**Body:**
```json
{
  "productId": "uuid-of-existing-product",
  "quantity": 2
}
```
**Response 201:**
```json
{
  "id": "uuid",
  "productId": "uuid",
  "quantity": 2,
  "totalPrice": 59.98,
  "status": "PENDING",
  "createdAt": "...",
  "updatedAt": "..."
}
```
**Response 404:** If `productId` does not exist in Product Service.

---

### `GET /orders`
**Response 200:** Array of orders, each enriched with `product` object:
```json
[
  {
    "id": "uuid",
    "productId": "uuid",
    "quantity": 2,
    "totalPrice": 59.98,
    "status": "PENDING",
    "product": {
      "id": "uuid",
      "name": "Wireless Mouse",
      "price": 29.99,
      "stock": 100
    }
  }
]
```

---

### `GET /orders/:id`
**Response 200:** Single enriched order (same shape as above, not array).
**Response 404:** `Order {id} not found`

---

### `PATCH /orders/:id`
**Body:**
```json
{ "status": "CONFIRMED" }
```
Allowed values: `PENDING`, `CONFIRMED`, `CANCELLED`.
**Response 200:** Updated order object (not enriched — raw DB record).

---

### `DELETE /orders/:id`
**Response 200:** Deleted order object.

---

## TCP Message Patterns (Internal Only)

These are internal only. Order Service calls these on Product Service.

| Pattern | Sent by | Payload | Returns |
|---|---|---|---|
| `{ cmd: 'get_product' }` | Order Service | `productId: string` | Product object or NotFoundException |
| `{ cmd: 'get_all_products' }` | Order Service (optional) | — | Product[] |

Usage in Order Service:
```typescript
// Single product (required — throws on not found)
const product = await firstValueFrom(
  this.productClient.send({ cmd: 'get_product' }, productId)
);

// Single product (optional — null fallback for deleted products)
const product = await firstValueFrom(
  this.productClient.send({ cmd: 'get_product' }, order.productId)
).catch(() => null);
```

---

## Environment Variables

**Product Service `.env`**
```
DATABASE_URL="file:./dev.db"
PRODUCT_SERVICE_PORT=3001
```

**Order Service `.env`**
```
DATABASE_URL="file:./dev.db"
ORDER_SERVICE_PORT=3002
PRODUCT_SERVICE_HOST=localhost
PRODUCT_SERVICE_TCP_PORT=3001
```

