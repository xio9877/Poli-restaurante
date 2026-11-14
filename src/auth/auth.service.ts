import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as jose from 'jose';
import { isInitialAdmin } from './initial-admin';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {}

  private getJWKS() {
    const jwksUrl = this.configService.get<string>('SUPABASE_JWKS_URL');
    if (!jwksUrl) throw new Error('SUPABASE_JWKS_URL not configured');
    return jose.createRemoteJWKSet(new URL(jwksUrl));
  }

  private getSupabaseUrl() {
    return this.configService.get<string>('SUPABASE_URL');
  }

  private getAnonKey() {
    return this.configService.get<string>('SUPABASE_ANON_KEY');
  }

  async login(email: string, password: string) {
    const supabaseUrl = this.getSupabaseUrl();
    const anonKey = this.getAnonKey();

    if (!supabaseUrl || !anonKey) {
      throw new Error('Supabase configuration missing');
    }

    console.log('[AUTH] Login attempt:', {
      email,
      supabaseUrl,
      anonKey: anonKey?.slice(0, 20) + '...',
    });

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log('[AUTH] Supabase response:', {
      status: response.ok,
      statusCode: response.status,
      data,
    });

    if (!response.ok) {
      throw new UnauthorizedException(
        data.msg || data.error_description || data.error || 'Credenciales inválidas'
      );
    }

    const { access_token, user } = data;

    const syncedUser = await this.syncSupabaseUser({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    return {
      access_token,
      user: syncedUser,
    };
  }

  async validateUser(jwt: string) {
    try {
      const JWKS = this.getJWKS();
      const { payload } = await jose.jwtVerify(jwt, JWKS, {
        issuer: this.configService.get<string>('SUPABASE_URL'),
      });
      const userId = payload.sub as string;
      const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException('User not found');
      return { user, userId };
    } catch (error) {
      if (
        error.code === 'ERR_JWT_INVALID' ||
        error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' ||
        error.code === 'ERR_JWT_EXPIRED'
      ) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw error;
    }
  }

  async getProfile(jwt: string) {
    const { user } = await this.validateUser(jwt);
    return user;
  }

  async syncSupabaseUser(supabaseUser: {
    id: string;
    email: string;
    user_metadata?: { name?: string; role?: string };
  }) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id: supabaseUser.id },
    });
    const isAdmin = isInitialAdmin(
      supabaseUser.email,
      this.configService.get<string>('INITIAL_ADMIN_EMAIL')
    );
    if (existingUser) {
      return this.prisma.client.user.update({
        where: { id: existingUser.id },
        data: {
          name: supabaseUser.user_metadata?.name || existingUser.name,
          username: supabaseUser.email,
          ...(isAdmin && { role: 'admin' }),
        },
      });
    }
    return this.prisma.client.user.create({
      data: {
        id: supabaseUser.id,
        name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
        username: supabaseUser.email,
        role: isAdmin ? 'admin' : 'waiter',
      },
    });
  }
}
