import { Module } from '@nestjs/common';
import { ClassDiaryService } from './class-diary.service';
import { ClassDiaryController } from './class-diary.controller';

@Module({
  controllers: [ClassDiaryController],
  providers: [ClassDiaryService],
  exports: [ClassDiaryService],
})
export class ClassDiaryModule {}
