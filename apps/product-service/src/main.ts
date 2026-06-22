import { NestFactory } from '@nestjs/core'
import { Transport, MicroserviceOptions } from '@nestjs/microservices'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()
  app.enableCors()

  // TCP listener for inter-service communication (called by order-service).
  // Must bind on a separate port from HTTP — NestJS cannot share a single port
  // between two different transports.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 3100 },
  })

  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalPipes(new ZodValidationPipe())

  const config = new DocumentBuilder()
    .setTitle('Product Service')
    .setDescription('CRUD API for retail products')
    .setVersion('1.0')
    .build()
  SwaggerModule.setup(
    'api/docs',
    app,
    cleanupOpenApiDoc(SwaggerModule.createDocument(app, config)),
  )

  await app.startAllMicroservices()
  await app.listen(3001)
  console.log('Product Service running on :3001 (HTTP) and :3100 (TCP)')
}

void bootstrap()
