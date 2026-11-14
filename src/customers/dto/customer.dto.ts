import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(70)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(70)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  phone: string;
}

export class CreateCustomerWithAddressDto extends CreateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(70)
  addressLabel: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  additionalInfo?: string;
}

export class CreateCustomerAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(70)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  additionalInfo?: string;
}
