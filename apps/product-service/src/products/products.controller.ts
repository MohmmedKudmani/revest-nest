import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common'
import { MessagePattern } from '@nestjs/microservices'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger'
import { ProductsService } from './products.service'
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from '../schemas/product.schema'
import type { StockAdjustmentInput } from '../schemas/product.schema'

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ── HTTP ──────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto)
  }

  @Get()
  @ApiOperation({
    summary: 'List products with search, filters, sorting and pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id)
  }

  // ── TCP (internal — called by order-service) ──────────────────────────────

  @ApiExcludeEndpoint()
  @MessagePattern({ cmd: 'get_product' })
  getProductTCP(id: string) {
    return this.productsService.findOne(id)
  }

  @ApiExcludeEndpoint()
  @MessagePattern({ cmd: 'get_all_products' })
  getAllProductsTCP() {
    return this.productsService.findAllRaw()
  }

  @ApiExcludeEndpoint()
  @MessagePattern({ cmd: 'search_products' })
  searchProductsTCP(name: string) {
    return this.productsService.searchByName(name)
  }

  @ApiExcludeEndpoint()
  @MessagePattern({ cmd: 'decrement_stock' })
  decrementStockTCP(payload: StockAdjustmentInput) {
    return this.productsService.decrementStock(payload.productId, payload.quantity)
  }

  @ApiExcludeEndpoint()
  @MessagePattern({ cmd: 'restore_stock' })
  restoreStockTCP(payload: StockAdjustmentInput) {
    return this.productsService.restoreStock(payload.productId, payload.quantity)
  }
}
