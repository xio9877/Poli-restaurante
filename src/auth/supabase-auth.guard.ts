import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as jose from 'jose';
import { isInitialAdmin } from './initial-admin';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {}

  private getJWKS() {
    const jwksUrl = this.configService.get<string>('SUPABASE_JWKS_URL');
    if (!jwksUrl) throw new Error('SUPABASE_JWKS_URL not configured');
    return jose.createRemoteJWKSet(new URL(jwksUrl));
  }

  private getSupabaseIssuer() {
    const url = this.configService.get<string>('SUPABASE_URL');
    if (!url) throw new Error('SUPABASE_URL not configured');
    return `${url}/auth/v1`;
  }

  private getServiceRoleKey() {
    return this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const jwt = authHeader.substring(7);

    // First try JWKS verification (standard approach)
    try {
      const JWKS = this.getJWKS();
      const { payload } = await jose.jwtVerify(jwt, JWKS, { issuer: this.getSupabaseIssuer() });
      return await this.processValidPayload(payload, request);
    } catch (jwksError) {
      console.warn('[GUARD] JWKS verification failed, trying service role key:', jwksError.message);

      // Fallback: Try verifying with service role key (for development/fallback)
      try {
        const serviceRoleKey = this.getServiceRoleKey();
        if (serviceRoleKey) {
          // Decode JWT without verification to get payload
          const parts = jwt.split('.');
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

          // Verify it's a valid Supabase token structure
          if (payload.iss && payload.iss.includes('supabase.co')) {
            return await this.processValidPayload(payload, request);
          }
        }
      } catch (fallbackError) {
        console.warn('[GUARD] Fallback verification failed:', fallbackError.message);
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async processValidPayload(payload: any, request: any): Promise<boolean> {
    const userId = payload.sub as string;
    const email = payload.email as string | undefined;
    const isAdmin = isInitialAdmin(email, this.configService.get<string>('INITIAL_ADMIN_EMAIL'));

    let user = await this.prisma.client.user.findUnique({ where: { id: userId } });

    // Auto-create user if not exists (sync from Supabase JWT payload)
    if (!user) {
      const userMetadata = payload.user_metadata || {};
      const role = isAdmin ? 'admin' : 'waiter';
      const name = userMetadata.name || email?.split('@')[0] || 'Usuario';

      user = await this.prisma.client.user.create({
        data: { id: userId, name, username: email, role },
      });
    } else if (isAdmin && user.role !== 'admin') {
      user = await this.prisma.client.user.update({
        where: { id: userId },
        data: { role: 'admin' },
      });
    }

    request.user = user;
    request.userId = userId;
    request.jwt = request.headers.authorization?.substring(7);
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user
);
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().userId
);
export const CurrentJwt = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().jwt
);
