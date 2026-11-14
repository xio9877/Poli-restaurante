import { IsOptional, IsString, IsIn, MinLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { BaseQueryDto } from '../../common/dto/query.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan.perez' })
  @IsString()
  username: string;

  @ApiProperty({
    enum: ['admin', 'waiter', 'kitchen', 'cashier', 'domiciliary'],
    example: 'waiter',
  })
  @IsIn(['admin', 'waiter', 'kitchen', 'cashier', 'domiciliary'])
  role: string;

  @ApiPropertyOptional({ example: 'auth-user-uuid-from-supabase' })
  @IsOptional()
  @IsString()
  authUserId?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UserQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: ['admin', 'waiter', 'kitchen', 'cashier', 'domiciliary'] })
  @IsOptional()
  @IsIn(['admin', 'waiter', 'kitchen', 'cashier', 'domiciliary'])
  role?: string;
}
