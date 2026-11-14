import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsInt,
  IsIn,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type OrderStatus = 'open' | 'in_preparation' | 'ready' | 'served' | 'canceled';

export class CreateOrderDetailDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDineInOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  tableId: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  @ApiProperty({ type: [CreateOrderDetailDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDetailDto)
  details: CreateOrderDetailDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: ['open', 'in_preparation', 'ready', 'served', 'canceled'],
    example: 'in_preparation',
  })
  @IsIn(['open', 'in_preparation', 'ready', 'served', 'canceled'])
  status: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [CreateOrderDetailDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDetailDto)
  details: CreateOrderDetailDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['open', 'in_preparation', 'ready', 'served', 'canceled'] })
  @IsOptional()
  @IsIn(['open', 'in_preparation', 'ready', 'served', 'canceled'])
  status?: string;
}
