import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

// ── Entity ────────────────────────────────────────────────────────────────────
// Single source of truth for the Product shape. All service methods and TCP
// handlers return this type — never import from the generated Prisma client.

export const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Product = z.infer<typeof ProductSchema>

// ── Create / Update ──────────────────────────────────────────────────────────
// UpdateProductSchema is fully optional so callers can patch any subset of fields.

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
})

export const UpdateProductSchema = CreateProductSchema.partial()

// Dto classes are required by nestjs-zod's ZodValidationPipe to bind and
// validate incoming request bodies via the Zod schemas above.
export class CreateProductDto extends createZodDto(CreateProductSchema) {}
export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}

export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>

// ── Query (search, filters, sorting, pagination) ─────────────────────────────
// z.coerce.number() is required because all query params arrive as strings from
// the URL. z.stringbool() handles "true"/"false" strings for boolean flags.

export const ProductQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  // "true" filters to stock > 0; combined with minStock it becomes stock >= max(1, minStock)
  inStock: z.stringbool().optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(['name', 'price', 'stock', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
})

export class ProductQueryDto extends createZodDto(ProductQuerySchema) {}
export type ProductQueryInput = z.infer<typeof ProductQuerySchema>
