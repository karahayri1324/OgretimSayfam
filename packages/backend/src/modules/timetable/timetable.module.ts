import { Module } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { TimetableController } from './timetable.controller';
import { FetIntegrationService } from './fet-integration.service';

@Module({
  controllers: [TimetableController],
  providers: [TimetableService, FetIntegrationService],
  exports: [TimetableService, FetIntegrationService],
})
export class TimetableModule {}
