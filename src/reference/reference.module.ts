import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReferenceFormatterService } from './reference-formatter.service';

@Module({
  imports: [ConfigModule],
  providers: [ReferenceFormatterService],
  exports: [ReferenceFormatterService],
})
export class ReferenceModule {}
