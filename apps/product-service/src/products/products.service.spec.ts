import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ProductsService } from './products.service'
import { PrismaService } from '../db/prisma.service'
import { Product } from '../schemas/product.schema'

const mockProduct: Product = {
  id: 'uuid-1',
  name: 'Wireless Keyboard',
  description: 'RGB mechanical keyboard',
  price: 79.99,
  stock: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPrisma = {
  product: {
    create: jest.fn<Promise<Product>, []>(),
    findMany: jest.fn<Promise<Product[]>, []>(),
    findUnique: jest.fn<Promise<Product | null>, []>(),
    update: jest.fn<Promise<Product>, []>(),
    delete: jest.fn<Promise<Product>, []>(),
    count: jest.fn<Promise<number>, []>(),
  },
  $transaction: jest.fn<Promise<[Product[], number]>, []>(),
}

describe('ProductsService', () => {
  let service: ProductsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ProductsService>(ProductsService)
    jest.clearAllMocks()
  })

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return a product', async () => {
      mockPrisma.product.create.mockResolvedValue(mockProduct)
      const result = await service.create({
        name: 'Wireless Keyboard',
        price: 79.99,
        stock: 50,
      })
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: { name: 'Wireless Keyboard', price: 79.99, stock: 50 },
      })
      expect(result).toEqual(mockProduct)
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

    it('should return paginated products with correct shape', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockProduct], 1])
      const result = await service.findAll(defaultQuery)
      expect(result.data).toEqual([mockProduct])
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      })
    })

    it('should apply name search filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])
      await service.findAll({ ...defaultQuery, search: 'keyboard' })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should apply inStock filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockProduct], 1])
      await service.findAll({ ...defaultQuery, inStock: true })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should apply price range filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockProduct], 1])
      await service.findAll({ ...defaultQuery, minPrice: 10, maxPrice: 100 })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should compute hasNextPage correctly when more pages exist', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [mockProduct, mockProduct],
        25,
      ])
      const result = await service.findAll({ ...defaultQuery, limit: 2 })
      expect(result.pagination.totalPages).toBe(13)
      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPrevPage).toBe(false)
    })

    it('should compute hasPrevPage correctly on page 2', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockProduct], 25])
      const result = await service.findAll({
        ...defaultQuery,
        page: 2,
        limit: 10,
      })
      expect(result.pagination.hasPrevPage).toBe(true)
    })
  })

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a product when found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      const result = await service.findOne('uuid-1')
      expect(result).toEqual(mockProduct)
    })

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException)
    })
  })

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the product', async () => {
      const updated: Product = { ...mockProduct, name: 'Updated Name' }
      mockPrisma.product.update.mockResolvedValue(updated)
      const result = await service.update('uuid-1', { name: 'Updated Name' })
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { name: 'Updated Name' },
      })
      expect(result).toEqual(updated)
    })
  })

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete the product', async () => {
      mockPrisma.product.delete.mockResolvedValue(mockProduct)
      await service.remove('uuid-1')
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      })
    })
  })

  // ── searchByName ──────────────────────────────────────────────────────────

  describe('searchByName', () => {
    it('should call findMany with name contains filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct])
      const result = await service.searchByName('key')
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'key' } },
      })
      expect(result).toEqual([mockProduct])
    })
  })
})
