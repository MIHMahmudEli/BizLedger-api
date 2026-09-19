import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Developer } from './entities/developer.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { DevelopersService } from './developers.service.js';
import { DevelopersController } from './developers.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Developer, Company])],
  controllers: [DevelopersController],
  providers: [DevelopersService],
  exports: [DevelopersService],
})
export class DevelopersModule {}
