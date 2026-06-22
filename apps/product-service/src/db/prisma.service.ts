import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { join } from 'node:path'
import { PrismaClient } from './generated/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// DATABASE_URL is set in Docker (file:/data/dev.db). The fallback keeps local
// `pnpm dev` working without any extra environment setup.
const dbUrl =
  process.env.DATABASE_URL ??
  `file:${join(process.cwd(), 'apps/product-service/src/db/prisma/dev.db')}`

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Prisma 7 requires a driver adapter for SQLite — the default query engine
    // is not used; better-sqlite3 handles all DB access directly.
    super({ adapter: new PrismaBetterSqlite3({ url: dbUrl }) })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
