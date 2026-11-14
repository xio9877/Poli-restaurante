import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CreateInvoiceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId: number;
}

export class UpdateInvoiceStatusDto {
  @IsIn(['draft', 'issued', 'canceled'])
  status: string;
}
