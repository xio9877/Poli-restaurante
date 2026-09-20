# Poli-Restaurante

Sistema de gestión de restaurante desarrollado con **NestJS**, **Prisma ORM**, **PostgreSQL** y **Supabase Auth**.

## Descripción

Aplicación backend para la gestión integral de un restaurante: mesas, pedidos (comedor y delivery), menú, facturación, pagos y usuarios con roles.

## Tecnologías

- **Framework**: NestJS 11
- **ORM**: Prisma 5
- **Base de datos**: PostgreSQL 16 (Supabase)
- **Auth**: Supabase Auth (JWT)
- **Validación**: class-validator + class-transformer
- **Health checks**: @nestjs/terminus
- **Documentación**: DBML + PlantUML (en `/docs`)

## Quick Start

### Local

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd poli-restaurante
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Base de datos
npm run prisma:generate
npm run prisma:migrate

# 4. Ejecutar
npm run start:dev
```

### GitHub Codespaces

1. Abrir en Codespaces (botón "Code" → "Codespaces" → "Create codespace on main")
2. Esperar a que termine el `postCreateCommand` (instala deps + prisma generate)
3. Ejecutar migraciones: `npm run prisma:migrate`
4. Iniciar: `npm run start:dev`

La app estará en `http://localhost:3000` (puerto forward automático).

## Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL | ✅ |
| `SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `SUPABASE_ANON_KEY` | Clave anónima Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role Supabase | ✅ |
| `JWT_SECRET` | Secreto JWT (mín 32 chars) | ✅ |
| `JWT_EXPIRES_IN` | Expiración token (ej: 1d) | ❌ (default: 1d) |
| `PORT` | Puerto servidor | ❌ (default: 3000) |
| `NODE_ENV` | Entorno (development/production/test) | ❌ (default: development) |

Ver `.env.example` para template.

## Scripts Disponibles

```bash
# Desarrollo
npm run start:dev      # Inicia con hot-reload
npm run start:debug    # Inicia con debugger (puerto 9229)

# Build & Typecheck
npm run build          # Compila a dist/
npm run typecheck      # Verifica tipos sin emitir

# Lint & Format
npm run lint           # ESLint + fix
npm run format         # Prettier

# Base de Datos
npm run prisma:generate    # Genera Prisma Client
npm run prisma:migrate     # Migraciones en desarrollo
npm run prisma:migrate:prod # Migraciones en producción
npm run prisma:studio      # Abre Prisma Studio (GUI)
npm run db:push            # Push schema sin migraciones
npm run db:reset           # Reset DB (cuidado!)

# Tests
npm run test           # Unit tests
npm run test:watch     # Watch mode
npm run test:cov       # Coverage
npm run test:e2e       # E2E tests
```

## Estructura del Proyecto

```
src/
├── auth/           # JWT, Guards, Strategies (Supabase)
├── users/          # CRUD usuarios + roles
├── customers/      # Clientes + direcciones
├── tables/         # Mesas del restaurante
├── menu/
│   ├── categories/ # Categorías de productos
│   └── products/   # Productos del menú
├── orders/
│   ├── dine-in/    # Pedidos en comedor
│   ├── delivery/   # Pedidos a domicilio
│   ├── details/    # Detalles de pedido
│   └── history/    # Historial de estados
├── billing/
│   ├── invoices/   # Facturas
│   └── payments/   # Pagos
├── common/         # DTOs, pipes, filters, interceptors, decorators
├── config/         # ConfigModule + validación Joi
├── database/       # PrismaService (global)
└── health/         # Health checks (terminus)
```

## Arquitectura

- **Diagrama ER**: [`docs/database/diagram.dbml`](../docs/database/diagram.dbml)
- **Diagrama de Clases**: [`docs/architecture/class-diagram.puml`](../docs/architecture/class-diagram.puml)

### Modelos Principales

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios del sistema (admin, waiter, kitchen, cashier, domiciliary) |
| `Customer` | Clientes del restaurante |
| `RestaurantTable` | Mesas (disponible/no disponible) |
| `Category` / `Product` | Menú |
| `Order` | Pedido base (comedor o delivery) |
| `DineInOrder` / `DeliveryOrder` | Extensiones por tipo |
| `OrderDetail` | Líneas de pedido |
| `Invoice` / `Payment` | Facturación y pagos |

## API Endpoints (planeados)

| Módulo | Endpoints |
|--------|-----------|
| Auth | `POST /auth/login`, `POST /auth/refresh` |
| Users | `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id` |
| Customers | `GET /customers`, `POST /customers`, `GET /customers/:id/addresses` |
| Tables | `GET /tables`, `GET /tables/available`, `POST /tables` |
| Menu | `GET /categories`, `GET /products`, `GET /products?categoryId=` |
| Orders | `POST /orders`, `GET /orders`, `PATCH /orders/:id/status` |
| Billing | `POST /invoices`, `POST /payments` |
| Health | `GET /health`, `GET /health/ready`, `GET /health/live` |

## Desarrollo

### Agregar Migración

```bash
# 1. Editar prisma/schema.prisma
# 2. Generar migración
npm run prisma:migrate
# 3. Se crea en prisma/migrations/
```

### Prisma Studio

```bash
npm run prisma:studio
# Abre http://localhost:5555
```

### Docker (Producción)

```bash
docker build -t poli-restaurante .
docker run -p 3000:3000 --env-file .env poli-restaurante
```

## Calidad de Código

- **ESLint**: `npm run lint` (con auto-fix)
- **Prettier**: `npm run format`
- **TypeScript**: `npm run typecheck` (strict mode)
- **Commits**: Conventional Commits (feat, fix, docs, refactor, test, chore)

## Licencia

Proyecto académico - Poli Restaurante