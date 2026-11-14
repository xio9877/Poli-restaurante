import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProcessPaymentDto {
  @IsIn(['cash', 'debit_card', 'credit_card', 'transfer', 'other'])
  method: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePaymentDto extends ProcessPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  invoiceId: number;

  @IsOptional()
  @IsIn(['pending'])
  status?: string;
}

export class UpdatePaymentStatusDto {
  @IsIn(['pending', 'failed'])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
