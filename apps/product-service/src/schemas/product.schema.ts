import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { PaginationSchema } from './pagination.schema'

// ── Entity ────────────────────────────────────────────────────────────────────

const ProductBaseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock: z.number().int(),
})

export const ProductSchema = ProductBaseSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
})

const ProductSwaggerSchema = ProductBaseSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Product = z.infer<typeof ProductSchema>

// ── Create / Update ──────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
})

export const UpdateProductSchema = CreateProductSchema.partial()

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}

export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>

// ── TCP stock mutation payload ────────────────────────────────────────────────

export const StockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
})

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>

// ── Query (search, filters, sorting, pagination) ─────────────────────────────

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

// ── Response DTOs (Swagger only) ─────────────────────────────────────────────

export class ProductDto extends createZodDto(ProductSwaggerSchema) {}

export class ProductResponseDto extends createZodDto(
  z.object({ message: z.string(), data: ProductSwaggerSchema }),
) {}

export class ProductListResponseDto extends createZodDto(
  z.object({
    data: z.array(ProductSwaggerSchema),
    pagination: PaginationSchema,
  }),
) {}
