import { IsInt, Min, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDetailDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderId: number;

  @ApiProperty({ example: 5 })
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

export class UpdateOrderDetailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDetailStatusDto {
  @ApiProperty({
    enum: ['pending', 'in_preparation', 'ready', 'served', 'canceled'],
    example: 'ready',
  })
  @IsIn(['pending', 'in_preparation', 'ready', 'served', 'canceled'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddDetailToOrderDto {
  @ApiProperty({ example: 5 })
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
