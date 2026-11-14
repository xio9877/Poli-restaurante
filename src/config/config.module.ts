import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        MIGRATION_DATABASE_URL: Joi.string().uri().optional(),
        DATABASE_SSL_CA_PATH: Joi.string().optional(),
        SUPABASE_URL: Joi.string().uri().required(),
        SUPABASE_ANON_KEY: Joi.string().required(),
        SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
        SUPABASE_JWKS_URL: Joi.string().uri().required(),
        INITIAL_ADMIN_EMAIL: Joi.string().email().optional(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('1d'),
        PORT: Joi.number().port().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
})
export class AppConfigModule {}
