import { Module } from '@nestjs/common';
import { ThesisController } from './thesis.controller';
import { ThesisService } from './thesis.service';
import { DocumentModule } from '../document/document.module';
import { LlmModule } from '../llm/llm.module';
import { ReferenceModule } from '../reference/reference.module';

@Module({
  imports: [DocumentModule, LlmModule, ReferenceModule],
  controllers: [ThesisController],
  providers: [ThesisService],
})
export class ThesisModule {}
