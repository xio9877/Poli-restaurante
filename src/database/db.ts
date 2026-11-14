import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as path from 'path';
import * as fs from 'fs';

// Load the generated Prisma client directly
const prismaClientPath = path.resolve(__dirname, '../database/generated/prisma/client');
const clientModule = require(prismaClientPath);
const { PrismaClient } = clientModule;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL es requerida para conectar con PostgreSQL');
}

const connectionUrl = new URL(databaseUrl);
for (const parameter of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslpassword']) {
  connectionUrl.searchParams.delete(parameter);
}
connectionUrl.searchParams.set('sslmode', 'require');
connectionUrl.searchParams.set('uselibpqcompat', 'true');

const adapter = new PrismaPg({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: 10,
});

export const prisma = new PrismaClient({ adapter });

export async function closeDatabase(): Promise<void> {
  await prisma.$disconnect();
}
