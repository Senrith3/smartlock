import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bull';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import * as expressBasicAuth from 'express-basic-auth';

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

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/bull-board');

  const sendCodeQueue = app.get<Queue>(`BullQueue_send-code`);
  const checkInQueue = app.get<Queue>(`BullQueue_room-check-in`);
  const checkOutQueue = app.get<Queue>(`BullQueue_room-check-out`);

  createBullBoard({
    queues: [
      new BullAdapter(sendCodeQueue),
      new BullAdapter(checkInQueue),
      new BullAdapter(checkOutQueue),
    ],
    serverAdapter,
  });

  app.use(
    '/bull-board',
    expressBasicAuth({
      users: {
        bullboard: process.env.BULL_BOARD_PASSWORD,
      },
      challenge: true,
    }),
    serverAdapter.getRouter(),
  );

  app.setGlobalPrefix('api');
  app.enableCors();

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
