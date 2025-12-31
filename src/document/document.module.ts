import { Module } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { TemplateService } from './template.service';

@Module({
  providers: [ExtractionService, TemplateService],
  exports: [ExtractionService, TemplateService],
})
export class DocumentModule {}
