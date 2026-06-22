import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../db/prisma.service'
import { buildPagination } from '../lib/utils'
import { Paginated } from '../schemas/pagination.schema'
import {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from '../schemas/product.schema'

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateProductInput) {
    return this.prisma.product.create({ data })
  }

  async findAll(query: ProductQueryInput): Promise<Paginated<Product>> {
    const {
      search,
      minPrice,
      maxPrice,
      inStock,
      minStock,
      sortBy,
      order,
      page,
      limit,
    } = query
    const skip = (page - 1) * limit

    const where = {
      ...(search && { name: { contains: search } }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { price: { gte: minPrice, lte: maxPrice } }
        : {}),
      // When both inStock and minStock are set, take the stricter of the two
      // (at least 1 in stock AND at least minStock units).
      ...(inStock === true && minStock !== undefined
        ? { stock: { gte: Math.max(1, minStock) } }
        : inStock === true
          ? { stock: { gt: 0 } }
          : minStock !== undefined
            ? { stock: { gte: minStock } }
            : {}),
    }

    // Single DB round-trip: fetch the page and the total count together.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ])

    return { data, pagination: buildPagination(total, page, limit) }
  }

  // Returns a flat array without pagination — used by TCP handlers so they
  // don't leak the { data, pagination } envelope to order-service.
  findAllRaw() {
    return this.prisma.product.findMany()
  }

  // Used by order-service via the TCP `search_products` pattern to resolve
  // product IDs from a name query before filtering orders locally.
  searchByName(name: string) {
    return this.prisma.product.findMany({ where: { name: { contains: name } } })
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } })
    if (!product) throw new NotFoundException('Product not found')
    return product
  }

  update(id: string, data: UpdateProductInput) {
    return this.prisma.product.update({ where: { id }, data })
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } })
  }
}
