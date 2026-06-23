import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { PaginationSchema } from './pagination.schema'

// ── Entity schemas ────────────────────────────────────────────────────────────

const ProductSnapshotBaseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock: z.number().int(),
})

// ProductSnapshotSchema mirrors the Product shape from product-service.
// Defined here rather than imported over the network so order-service has no
// compile-time dependency on product-service's generated Prisma client.
export const ProductSnapshotSchema = ProductSnapshotBaseSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
})

const ProductSnapshotSwaggerSchema = ProductSnapshotBaseSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
})

const OrderBaseSchema = z.object({
  id: z.uuid(),
  productId: z.string(),
  quantity: z.number().int(),
  // totalPrice is computed at creation time (price × quantity) and stored so
  // the value is stable even if the product price changes later.
  totalPrice: z.number(),
  status: z.string(),
})

export const OrderSchema = OrderBaseSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
})

const OrderSwaggerSchema = OrderBaseSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
})

// OrderWithProduct is the enriched read shape — the product field is populated
// via a TCP call to product-service at query time. It is null when the TCP call
// fails (product deleted or service unreachable) so reads never throw.
export const OrderWithProductSchema = OrderSchema.extend({
  product: ProductSnapshotSchema.nullable(),
})

const OrderWithProductSwaggerSchema = OrderSwaggerSchema.extend({
  product: ProductSnapshotSwaggerSchema.nullable(),
})

export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>
export type Order = z.infer<typeof OrderSchema>
export type OrderWithProduct = z.infer<typeof OrderWithProductSchema>

// ── Create / Update ──────────────────────────────────────────────────────────

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

// ── Response DTOs (Swagger only) ─────────────────────────────────────────────

export class OrderWithProductDto extends createZodDto(OrderWithProductSwaggerSchema) {}

export class OrderResponseDto extends createZodDto(
  z.object({ message: z.string(), data: OrderSwaggerSchema }),
) {}

export class OrderListResponseDto extends createZodDto(
  z.object({ data: z.array(OrderWithProductSwaggerSchema), pagination: PaginationSchema }),
) {}
