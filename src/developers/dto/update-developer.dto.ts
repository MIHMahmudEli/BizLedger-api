import { PartialType } from '@nestjs/swagger';
import { CreateDeveloperDto } from './create-developer.dto.js';

export class UpdateDeveloperDto extends PartialType(CreateDeveloperDto) {}
