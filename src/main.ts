import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    credentials: false,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Thesis Formatter API')
    .setDescription(`
## Overview
Thesis Formatter Microservice - Convert documents to formatted thesis PDFs using LaTeX templates.

## Workflow
1. **Upload** a document (DOCX/PDF) → returns jobId
2. **Poll** job status until complete
3. **Download** the formatted PDF

## Templates
- \`njulife-2\`: 南京大学生命科学学院硕士学位论文 v2 (with cover PDF modification)
- \`njulife\`: 南京大学生命科学学院硕士学位论文
- \`thu\`: 清华大学本科学位论文

## Cover PDF Modification (njulife-2)
When using njulife-2 template, the cover.pdf is automatically modified with:
- Page 1: 论文题目, 作者姓名, 专业名称, 研究方向, 导师姓名
- Page 3: 中文题目, 英文题目, 作者, 导师
    `)
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('thesis', 'Thesis processing and conversion')
    .addTag('templates', 'Template management')
    .addTag('admin', 'Admin operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Thesis Formatter Microservice running on port ${port}`);
  logger.log(`Swagger UI: http://localhost:${port}/api`);
  logger.log(`Upload endpoint: POST http://localhost:${port}/thesis/upload`);
}

bootstrap();
