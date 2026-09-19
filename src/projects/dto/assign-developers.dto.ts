import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDevelopersDto {
  @ApiProperty({ type: [String], description: 'Full list of developer IDs assigned to this project' })
  @IsArray()
  @IsUUID('4', { each: true })
  developerIds: string[];
}
