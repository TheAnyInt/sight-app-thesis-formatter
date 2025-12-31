import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThesisModule } from './thesis/thesis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThesisModule,
  ],
})
export class AppModule {}
