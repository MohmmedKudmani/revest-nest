import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { join } from 'node:path'
import { PrismaClient } from './generated/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl =
  process.env.DATABASE_URL ??
  `file:${join(process.cwd(), 'apps/product-service/src/db/prisma/dev.db')}`

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: new PrismaBetterSqlite3({ url: dbUrl }) })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
