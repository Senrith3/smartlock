import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  app.enableCors();
  // app.use(helmet());
  const config = new DocumentBuilder()
    .setTitle('Smartlock')
    .setDescription(`Smartlock's API`)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  Logger.log('Swagger APIs: http://localhost:3000/api/#/');
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
