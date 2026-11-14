import { Controller, Get, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class LoginDto {
  @ApiProperty({ example: 'admin@poli.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'demo123' })
  @IsString()
  @MinLength(1)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    return { user: req.user };
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('validate')
  async validateToken(@Req() req: any) {
    return { valid: true, user: req.user };
  }
}
