import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '../db/prisma.service'
import { buildPagination } from '../lib/utils'
import { Paginated } from '../schemas/pagination.schema'
import {
  CreateOrderInput,
  UpdateOrderInput,
  OrderQueryInput,
  OrderWithProduct,
  ProductSnapshot,
} from '../schemas/order.schema'

// Rounds price × quantity to 2 decimal places to avoid floating-point drift
// (e.g. 34.99 × 3 = 104.97000...001 without rounding).
function computeTotalPrice(price: number, quantity: number): number {
  return Math.round(price * quantity * 100) / 100
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    // TCP client injected by ClientsModule — talks to product-service on :3100.
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
  ) {}

  async create(data: CreateOrderInput) {
    // Validate the product exists and fetch its current price via TCP before
    // writing the order. The totalPrice is locked at creation time.
    const product = await firstValueFrom<ProductSnapshot | null>(
      this.productClient.send({ cmd: 'get_product' }, data.productId),
    )
    if (!product) throw new NotFoundException('Product not found')

    // Fast pre-check: friendly error before the atomic TCP call below.
    if (data.quantity > product.stock) {
      throw new BadRequestException(
        `Insufficient stock: requested ${data.quantity}, available ${product.stock}`,
      )
    }

    // Atomically reserve stock on product-service — final authority, closes
    // the race between the pre-check above and the actual decrement.
    await firstValueFrom<ProductSnapshot>(
      this.productClient.send(
        { cmd: 'decrement_stock' },
        { productId: data.productId, quantity: data.quantity },
      ),
    ).catch((err: unknown) => {
      const msg =
        err instanceof Error ? err.message : 'Insufficient stock'
      throw new BadRequestException(msg)
    })

    // Explicit intermediate variable breaks the `any` chain from ClientProxy.send()
    // so ESLint can confirm price is a number before arithmetic.
    const price: number = product.price
    return this.prisma.order.create({
      data: {
        productId: data.productId,
        quantity: data.quantity,
        totalPrice: computeTotalPrice(price, data.quantity),
      },
    })
  }

  async findAll(query: OrderQueryInput): Promise<Paginated<OrderWithProduct>> {
    const { search, status, productId, sortBy, order, page, limit } = query
    const skip = (page - 1) * limit

    let resolvedProductId: string | { in: string[] } | undefined = productId

    // Cross-service search: resolve product name → IDs via TCP, then filter
    // orders by those IDs locally. Short-circuit to an empty page if nothing
    // matches so we never run a useless DB query.
    if (search) {
      const matched = await firstValueFrom<ProductSnapshot[]>(
        this.productClient.send({ cmd: 'search_products' }, search),
      ).catch((): ProductSnapshot[] => [])
      const ids = matched.map((p) => p.id)

      if (ids.length === 0) {
        return { data: [], pagination: buildPagination(0, page, limit) }
      }

      if (productId) {
        // If caller also filtered by a specific productId, both constraints must
        // be satisfied — return empty if that product wasn't in the search results.
        if (!ids.includes(productId)) {
          return { data: [], pagination: buildPagination(0, page, limit) }
        }
      } else {
        resolvedProductId = { in: ids }
      }
    }

    const where = {
      ...(status && { status }),
      ...(resolvedProductId !== undefined
        ? { productId: resolvedProductId }
        : {}),
    }

    // Single DB round-trip for the page + total count.
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ])

    // Enrich each order with its product details via TCP. If product-service is
    // unreachable or the product was deleted, product is set to null rather than
    // throwing — orders must remain readable even if the product is gone.
    const data: OrderWithProduct[] = await Promise.all(
      orders.map(async (o) => {
        const product = await firstValueFrom<ProductSnapshot | null>(
          this.productClient.send({ cmd: 'get_product' }, o.productId),
        ).catch((): null => null)
        return { ...o, product }
      }),
    )

    return { data, pagination: buildPagination(total, page, limit) }
  }

  async findOne(id: string): Promise<OrderWithProduct> {
    const order = await this.prisma.order.findUnique({ where: { id } })

    if (!order) throw new NotFoundException('Order not found')

    // Same null-safe enrichment pattern as findAll — product may be unavailable.
    const product = await firstValueFrom<ProductSnapshot | null>(
      this.productClient.send({ cmd: 'get_product' }, order.productId),
    ).catch((): null => null)

    return { ...order, product }
  }

  async update(id: string, data: UpdateOrderInput) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundException('Order not found')

    // Restore stock only on the first transition to CANCELLED so we never
    // double-restore if the order was already cancelled.
    if (data.status === 'CANCELLED' && order.status !== 'CANCELLED') {
      await this.restoreStock(order.productId, order.quantity)
    }

    return this.prisma.order.update({ where: { id }, data })
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundException('Order not found')

    // A cancelled order already returned its stock — don't restore a second time.
    if (order.status !== 'CANCELLED') {
      await this.restoreStock(order.productId, order.quantity)
    }

    return this.prisma.order.delete({ where: { id } })
  }

  // Tolerates a product that was deleted after the order was placed — if
  // product-service throws, the cancel/delete still succeeds.
  private async restoreStock(productId: string, quantity: number): Promise<void> {
    await firstValueFrom<ProductSnapshot>(
      this.productClient.send({ cmd: 'restore_stock' }, { productId, quantity }),
    ).catch(() => undefined)
  }
}
