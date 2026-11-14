import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDineInDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderId: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  tableId: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;
}

export class UpdateDineInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  tableId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;
}
