import { z } from 'zod'

// PaginationSchema describes the metadata block returned alongside every list
// response. All fields are derived from total count + requested page/limit.
export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
})

// PaginatedSchema is a generic factory for wrapping any list response in the
// standard { data, pagination } envelope expected by the frontend.
export const PaginatedSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: PaginationSchema,
  })

export type Pagination = z.infer<typeof PaginationSchema>
export type Paginated<T> = { data: T[]; pagination: Pagination }
