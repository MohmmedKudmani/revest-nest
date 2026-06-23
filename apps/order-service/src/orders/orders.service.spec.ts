import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { Observable, of } from 'rxjs'
import { OrdersService } from './orders.service'
import { PrismaService } from '../db/prisma.service'
import { Order, ProductSnapshot } from '../schemas/order.schema'

const mockProduct: ProductSnapshot = {
  id: 'product-uuid-1',
  name: 'Wireless Keyboard',
  price: 79.99,
  stock: 50,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockOrder: Order = {
  id: 'order-uuid-1',
  productId: 'product-uuid-1',
  quantity: 2,
  totalPrice: 159.98,
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPrisma = {
  order: {
    create: jest.fn<Promise<Order>, []>(),
    findMany: jest.fn<Promise<Order[]>, []>(),
    findUnique: jest.fn<Promise<Order | null>, []>(),
    update: jest.fn<Promise<Order>, []>(),
    delete: jest.fn<Promise<Order>, []>(),
    count: jest.fn<Promise<number>, []>(),
  },
  $transaction: jest.fn<Promise<[Order[], number]>, []>(),
}

const mockProductClient = {
  send: jest.fn<Observable<ProductSnapshot | ProductSnapshot[] | null>, []>(),
}

describe('OrdersService', () => {
  let service: OrdersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'PRODUCT_SERVICE', useValue: mockProductClient },
      ],
    }).compile()

    service = module.get<OrdersService>(OrdersService)
    jest.clearAllMocks()
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should fetch product via TCP, compute totalPrice, and create order', async () => {
      mockProductClient.send.mockReturnValue(of(mockProduct))
      mockPrisma.order.create.mockResolvedValue(mockOrder)

      const result = await service.create({
        productId: 'product-uuid-1',
        quantity: 2,
      })

      expect(mockProductClient.send).toHaveBeenCalledWith(
        { cmd: 'get_product' },
        'product-uuid-1',
      )
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: { productId: 'product-uuid-1', quantity: 2, totalPrice: 159.98 },
      })
      expect(result).toEqual(mockOrder)
    })

    it('should round totalPrice to 2 decimal places', async () => {
      const productWithOddPrice: ProductSnapshot = {
        ...mockProduct,
        price: 34.99,
      }
      mockProductClient.send.mockReturnValue(of(productWithOddPrice))
      mockPrisma.order.create.mockResolvedValue({
        ...mockOrder,
        totalPrice: 174.95,
      })

      await service.create({ productId: 'product-uuid-1', quantity: 5 })

      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: { productId: 'product-uuid-1', quantity: 5, totalPrice: 174.95 },
      })
    })

    it('should throw NotFoundException when product is not found', async () => {
      mockProductClient.send.mockReturnValue(of(null))
      await expect(
        service.create({ productId: 'bad-id', quantity: 1 }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const defaultQuery = {
      sortBy: 'createdAt' as const,
      order: 'desc' as const,
      page: 1,
      limit: 10,
    }

    it('should return paginated orders enriched with product', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockOrder], 1])
      mockProductClient.send.mockReturnValue(of(mockProduct))

      const result = await service.findAll(defaultQuery)

      expect(result.data[0]).toMatchObject({
        ...mockOrder,
        product: mockProduct,
      })
      expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 1 })
    })

    it('should filter by status', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockOrder], 1])
      mockProductClient.send.mockReturnValue(of(mockProduct))

      await service.findAll({ ...defaultQuery, status: 'PENDING' })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should perform cross-service search and filter by matched product ids', async () => {
      mockProductClient.send
        .mockReturnValueOnce(of([mockProduct]))
        .mockReturnValue(of(mockProduct))
      mockPrisma.$transaction.mockResolvedValue([[mockOrder], 1])

      const result = await service.findAll({
        ...defaultQuery,
        search: 'Keyboard',
      })

      expect(mockProductClient.send).toHaveBeenCalledWith(
        { cmd: 'search_products' },
        'Keyboard',
      )
      expect(result.data).toHaveLength(1)
    })

    it('should return empty page immediately when search matches no products', async () => {
      mockProductClient.send.mockReturnValue(of([]))

      const result = await service.findAll({ ...defaultQuery, search: 'zzzzz' })

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('should set product to null when enrichment TCP call fails', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockOrder], 1])
      mockProductClient.send.mockReturnValue(of(null))

      const result = await service.findAll(defaultQuery)
      expect(result.data[0].product).toBeNull()
    })
  })

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return an order enriched with product', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockProductClient.send.mockReturnValue(of(mockProduct))

      const result = await service.findOne('order-uuid-1')
      expect(result).toMatchObject({ ...mockOrder, product: mockProduct })
    })

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException)
    })
  })

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the order', async () => {
      const updated: Order = { ...mockOrder, status: 'CONFIRMED' }
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue(updated)

      const result = await service.update('order-uuid-1', {
        status: 'CONFIRMED',
      })
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-uuid-1' },
        data: { status: 'CONFIRMED' },
      })
      expect(result).toEqual(updated)
    })
  })

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete the order', async () => {
      mockPrisma.order.delete.mockResolvedValue(mockOrder)
      await service.remove('order-uuid-1')
      expect(mockPrisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order-uuid-1' },
      })
    })
  })
})
