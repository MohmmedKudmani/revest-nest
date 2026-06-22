import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

// ── Entity schemas ────────────────────────────────────────────────────────────

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
  totalPrice: z.number(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const OrderWithProductSchema = OrderSchema.extend({
  product: ProductSnapshotSchema.nullable(),
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
