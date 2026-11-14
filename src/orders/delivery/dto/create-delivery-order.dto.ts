import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsIn,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'canceled';

class DeliveryOrderDetailDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDeliveryOrderDto {
  @IsString()
  @MinLength(1)
  customerId: string;

  @IsInt()
  @Min(1)
  addressId: number;

  @IsString()
  @MinLength(1)
  domiciliaryId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryOrderDetailDto)
  details: DeliveryOrderDetailDto[];
}

export class CreateDeliveryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId: number;

  @IsString()
  @MinLength(1)
  customerId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId: number;

  @IsString()
  @MinLength(1)
  domiciliaryId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliveryFee?: number;
}

export class UpdateDeliveryStatusDto {
  @IsIn(['pending', 'assigned', 'picked_up', 'delivered', 'canceled'])
  status: DeliveryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class UpdateDeliveryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  customerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addressId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  domiciliaryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliveryFee?: number;
}
