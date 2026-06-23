import { join } from 'node:path'
import { PrismaClient } from '../apps/product-service/src/db/generated/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl =
  process.env.DATABASE_URL ??
  `file:${join(process.cwd(), 'apps/product-service/src/db/prisma/dev.db')}`

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbUrl }),
})

const products = [
  {
    name: 'Classic White T-Shirt',
    description: 'Cotton crew neck t-shirt, unisex fit',
    price: 49.99,
    stock: 120,
  },
  {
    name: 'Slim Fit Chinos',
    description: 'Stretch chino trousers in khaki',
    price: 149.99,
    stock: 75,
  },
  {
    name: 'Oxford Button-Down Shirt',
    description: 'Formal oxford shirt in pale blue',
    price: 199.99,
    stock: 60,
  },
  {
    name: 'Denim Jacket',
    description: 'Classic blue denim jacket, mid-weight',
    price: 299.99,
    stock: 40,
  },
  {
    name: 'Leather Sneakers',
    description: 'White leather low-top sneakers',
    price: 399.99,
    stock: 35,
  },
  {
    name: 'Running Shorts',
    description: 'Lightweight moisture-wicking shorts',
    price: 79.99,
    stock: 90,
  },
  {
    name: 'Wool Blend Blazer',
    description: 'Slim-cut blazer in charcoal grey',
    price: 549.99,
    stock: 25,
  },
  {
    name: 'Canvas Tote Bag',
    description: 'Large natural canvas tote with inner pocket',
    price: 89.99,
    stock: 55,
  },
  {
    name: 'Aviator Sunglasses',
    description: 'Polarised UV400 aviator frames',
    price: 249.99,
    stock: 48,
  },
  {
    name: 'Leather Bifold Wallet',
    description: 'Slim full-grain leather bifold',
    price: 179.99,
    stock: 65,
  },
  {
    name: 'Crew Neck Sweater',
    description: 'Merino wool crew neck in navy',
    price: 329.99,
    stock: 42,
  },
  {
    name: 'Cargo Pants',
    description: 'Multi-pocket ripstop cargo trousers',
    price: 219.99,
    stock: 38,
  },
  {
    name: 'Polo Shirt',
    description: 'Pique cotton polo in forest green',
    price: 129.99,
    stock: 80,
  },
  {
    name: 'Stainless Steel Watch',
    description: 'Minimalist quartz watch with mesh strap',
    price: 699.99,
    stock: 20,
  },
  {
    name: 'Backpack 25L',
    description: 'Water-resistant daypack with laptop sleeve',
    price: 449.99,
    stock: 30,
  },
  {
    name: 'Chukka Boots',
    description: 'Suede chukka boots in tan',
    price: 499.99,
    stock: 28,
  },
  {
    name: 'Compression Leggings',
    description: 'High-waist compression leggings for sport',
    price: 119.99,
    stock: 95,
  },
  {
    name: 'Linen Shirt',
    description: 'Relaxed-fit linen shirt in off-white',
    price: 159.99,
    stock: 50,
  },
  {
    name: 'Baseball Cap',
    description: 'Structured 6-panel cap with curved brim',
    price: 69.99,
    stock: 110,
  },
  {
    name: 'Puffer Vest',
    description: 'Lightweight quilted vest with down fill',
    price: 279.99,
    stock: 33,
  },
]

async function main() {
  const count = await prisma.product.count()
  if (count > 0) {
    console.log(`Seed skipped — ${count} products already exist.`)
    return
  }
  console.log('Seeding products...')
  await prisma.product.createMany({ data: products })
  console.log(`Seeded ${products.length} products.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
