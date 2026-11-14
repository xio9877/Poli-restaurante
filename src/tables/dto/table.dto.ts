import { IsInt, Min, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { BaseQueryDto } from '../../common/dto/query.dto';

export class CreateTableDto {
  @ApiProperty({ example: 'Mesa 1' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTableDto extends PartialType(CreateTableDto) {}

export class UpdateTableStateDto {
  @ApiProperty({ enum: ['available', 'unavailable'], example: 'unavailable' })
  @IsIn(['available', 'unavailable'])
  state: string;
}

export class TableQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: ['available', 'unavailable'] })
  @IsOptional()
  @IsIn(['available', 'unavailable'])
  state?: string;
}
