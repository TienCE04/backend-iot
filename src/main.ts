import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //  Cho phép CORS (để client như React, Angular gọi API)
  app.enableCors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  //  Dùng ValidationPipe để tự validate DTO (tự động báo lỗi nếu thiếu field)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // loại bỏ field thừa
      forbidNonWhitelisted: true, // báo lỗi nếu có field lạ
      transform: true, // tự chuyển kiểu dữ liệu (VD: string -> number)
    }),
  );

  //  Swagger config
  const config = new DocumentBuilder()
    .setTitle('Smart Plant Monitoring & Watering System API')
    .setDescription(
      'API documentation for Smart Plant Monitoring and Watering System project — built with NestJS & Prisma',
    )
    .setVersion('1.0')
    .addBearerAuth() //  Thêm nút Authorize (JWT)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // giữ lại token khi reload trang
    },
  });

  // Chạy server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(` Server is running on http://localhost:${port}`);
  console.log(` Swagger docs available at http://localhost:${port}/api`);
}

bootstrap();