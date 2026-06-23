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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  OrderResponseDto,
  OrderListResponseDto,
  OrderWithProductDto,
} from '../schemas/order.schema'

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto)
  }

  @Get()
  @ApiOperation({
    summary: 'List orders with search by product name, filters, sorting and pagination',
  })
  @ApiResponse({ status: 200, type: OrderListResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiResponse({ status: 200, type: OrderWithProductDto })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id)
  }
}
