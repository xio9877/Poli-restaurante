import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

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
  customerId: string;

  @IsInt()
  @Min(1)
  addressId: number;

  @IsString()
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
