import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()
  app.enableCors()

  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalPipes(new ZodValidationPipe())

  const config = new DocumentBuilder()
    .setTitle('Order Service')
    .setDescription('CRUD API for retail orders')
    .setVersion('1.0')
    .build()
  SwaggerModule.setup(
    'api/docs',
    app,
    cleanupOpenApiDoc(SwaggerModule.createDocument(app, config)),
  )

  await app.listen(3002)
  console.log('Order Service running on :3002')
}

void bootstrap()
