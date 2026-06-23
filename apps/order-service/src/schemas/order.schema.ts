import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

// ── Entity schemas ────────────────────────────────────────────────────────────

// ProductSnapshotSchema mirrors the Product shape from product-service.
// Defined here rather than imported over the network so order-service has no
// compile-time dependency on product-service's generated Prisma client.
export const ProductSnapshotSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const OrderSchema = z.object({
  id: z.uuid(),
  productId: z.string(),
  quantity: z.number().int(),
  // totalPrice is computed at creation time (price × quantity) and stored so
  // the value is stable even if the product price changes later.
  totalPrice: z.number(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// OrderWithProduct is the enriched read shape — the product field is populated
// via a TCP call to product-service at query time. It is null when the TCP call
// fails (product deleted or service unreachable) so reads never throw.
export const OrderWithProductSchema = OrderSchema.extend({
  product: ProductSnapshotSchema.nullable(),
})

export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>
export type Order = z.infer<typeof OrderSchema>
export type OrderWithProduct = z.infer<typeof OrderWithProductSchema>

// ── Create / Update ──────────────────────────────────────────────────────────
// Updates are intentionally limited to status only — quantity and price are
// fixed at creation to preserve the original order record.

export const CreateOrderSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1),
})

export const UpdateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
})

export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}
export class UpdateOrderDto extends createZodDto(UpdateOrderSchema) {}

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>

// ── Query (search, filters, sorting, pagination) ─────────────────────────────
// `search` filters by product name via a TCP call to product-service
// (search_products pattern) rather than a local DB query, since product names
// live in a separate database.

export const OrderQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  productId: z.uuid().optional(),
  sortBy: z.enum(['createdAt', 'totalPrice', 'quantity']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
})

export class OrderQueryDto extends createZodDto(OrderQuerySchema) {}
export type OrderQueryInput = z.infer<typeof OrderQuerySchema>

// ── Response DTOs (used by controllers for Swagger @ApiResponse type:) ────────
// z.date() cannot be serialised to JSON Schema (Zod v4), so dates are z.string() here.

import { PaginationSchema } from './pagination.schema'

const ProductSnapshotSwaggerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const OrderSwaggerSchema = z.object({
  id: z.uuid(),
  productId: z.string(),
  quantity: z.number().int(),
  totalPrice: z.number(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const OrderWithProductSwaggerSchema = z.object({
  id: z.uuid(),
  productId: z.string(),
  quantity: z.number().int(),
  totalPrice: z.number(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  product: ProductSnapshotSwaggerSchema.nullable(),
})

export const OrderResponseSchema = z.object({ message: z.string(), data: OrderSwaggerSchema })
export class OrderResponseDto extends createZodDto(OrderResponseSchema) {}

export const OrderListResponseSchema = z.object({
  data: z.array(OrderWithProductSwaggerSchema),
  pagination: PaginationSchema,
})
export class OrderListResponseDto extends createZodDto(OrderListResponseSchema) {}

export class OrderWithProductDto extends createZodDto(OrderWithProductSwaggerSchema) {}
