import { Pagination } from '../schemas/pagination.schema'

// Derives the full pagination metadata from a DB count result.
// Called after every $transaction([findMany, count]) to build the response envelope.
export function buildPagination(
  total: number,
  page: number,
  limit: number,
): Pagination {
  const totalPages = Math.ceil(total / limit)
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}
