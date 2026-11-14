import 'dotenv/config';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

function getMigrationConnection(): string {
  const connection = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connection) {
    throw new Error('MIGRATION_DATABASE_URL o DATABASE_URL es requerida para migraciones');
  }

  console.log('Using connection:', connection.replace(/:[^:@]+@/, ':****@'));

  const url = new URL(connection);
  url.searchParams.delete('ssl');
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');
  url.searchParams.delete('sslcert');
  url.searchParams.delete('sslkey');
  url.searchParams.delete('sslpassword');
  url.searchParams.set('sslmode', 'require');

  const caPath = process.env.DATABASE_SSL_CA_PATH;
  if (caPath) {
    url.searchParams.set('sslrootcert', resolve(caPath));
  }

  console.log('Final URL port:', new URL(url.toString()).port);
  return url.toString();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: getMigrationConnection(),
  },
});
