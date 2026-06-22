import { Inject, Injectable, NotFoundException } from '@nestjs/common'
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

function computeTotalPrice(price: number, quantity: number): number {
  return Math.round(price * quantity * 100) / 100
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
  ) {}

  async create(data: CreateOrderInput) {
    const product = await firstValueFrom<ProductSnapshot | null>(
      this.productClient.send({ cmd: 'get_product' }, data.productId),
    )
    if (!product) throw new NotFoundException('Product not found')

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

    // Cross-service: search by product name via TCP
    if (search) {
      const matched = await firstValueFrom<ProductSnapshot[]>(
        this.productClient.send({ cmd: 'search_products' }, search),
      ).catch((): ProductSnapshot[] => [])
      const ids = matched.map((p) => p.id)

      if (ids.length === 0) {
        return { data: [], pagination: buildPagination(0, page, limit) }
      }

      if (productId) {
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

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ])

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

    const product = await firstValueFrom<ProductSnapshot | null>(
      this.productClient.send({ cmd: 'get_product' }, order.productId),
    ).catch((): null => null)

    return { ...order, product }
  }

  update(id: string, data: UpdateOrderInput) {
    return this.prisma.order.update({ where: { id }, data })
  }

  remove(id: string) {
    return this.prisma.order.delete({ where: { id } })
  }
}
