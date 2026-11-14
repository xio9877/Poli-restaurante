import { IsInt, Min, IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiProperty({ example: 'Bandeja Paisa' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ enum: ['available', 'unavailable'], example: 'available' })
  @IsOptional()
  @IsIn(['available', 'unavailable'])
  status?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class UpdateProductStatusDto {
  @ApiProperty({ enum: ['available', 'unavailable'], example: 'unavailable' })
  @IsIn(['available', 'unavailable'])
  status: string;
}
