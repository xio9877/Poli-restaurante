# Poli Restaurante - Backend API

Sistema de gestión de restaurante construido con **NestJS 10**, **Prisma ORM**, **PostgreSQL (Supabase)** y **Supabase Auth (JWT ES256)**.

## Arquitectura

```
src/
├── auth/           # Autenticación JWT (Supabase JWKS)
├── users/          # Usuarios del sistema (roles: admin, waiter, kitchen, cashier, domiciliary)
├── customers/      # Clientes y direcciones
├── tables/         # Mesas del restaurante
├── menu/
│   ├── categories/ # Categorías de productos
│   └── products/   # Productos/Platos
├── orders/
│   ├── dine-in/    # Órdenes en mesa
│   ├── delivery/   # Órdenes a domicilio
│   ├── details/    # Detalles de orden (productos)
│   └── history/    # Historial de estados
├── kitchen/        # Vista cocina (pedidos pendientes, tiempos)
├── billing/
│   ├── invoices/   # Facturas
│   └── payments/   # Pagos
├── admin/          # Panel admin (CRUD + reportes)
├── health/         # Health checks
├── database/       # Prisma client + connection
├── config/         # ConfigModule con validación Joi
└── common/         # DTOs, guards, decorators
```

## Requisitos

- Node.js >= 20.19.0
- PostgreSQL (Supabase)
- Supabase Project (para Auth)

## Configuración

### Variables de entorno (`.env`)

```bash
# Database (Supabase Pooler - Transaction mode para app, Session mode para migraciones)
DATABASE_URL=postgresql://postgres.<ref>:<pass>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&uselibpqcompat=true
MIGRATION_DATABASE_URL=postgresql://postgres.<ref>:<pass>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require

# Supabase Auth
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_JWKS_URL=https://<ref>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
INITIAL_ADMIN_EMAIL=<correo-de-la-cuenta-administradora>

# JWT
JWT_SECRET=<random-32-chars-min>
JWT_EXPIRES_IN=1d

# App
PORT=3000
NODE_ENV=development
```

`INITIAL_ADMIN_EMAIL` is optional. When configured, that Supabase account receives the `admin` role on login, including if its local user record already exists. Other new accounts default to `waiter`; public user metadata cannot grant administrator privileges.

### Instalación

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev
```

`npm run dev` uses `scripts/dev.ps1` to build the backend and frontend, then starts both services together. Open `http://localhost:5173`; the API and Swagger UI are available at `http://localhost:3000` and `http://localhost:3000/api`.

## Autenticación

- **Tipo**: Bearer Token (JWT emitido por Supabase Auth)
- **Validación**: JWKS remoto (ES256) + verificación de `iss` y `sub`
- **Guard**: `SupabaseAuthGuard` en todos los endpoints protegidos
- **Usuario actual**: `@CurrentUserId()` decorator extrae `sub` del JWT

```bash
# Header requerido en todas las peticiones
Authorization: Bearer <supabase-jwt>
```

## Endpoints API

### Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/auth/profile` | Perfil del usuario autenticado |
| GET | `/auth/validate` | Validar token |

### Health
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check básico |

### Users (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/users` | Crear usuario |
| GET | `/users` | Listar usuarios (paginado, filtro role, search) |
| GET | `/users/role/:role` | Usuarios por rol |
| GET | `/users/:id` | Obtener usuario |
| PATCH | `/users/:id` | Actualizar usuario |
| DELETE | `/users/:id` | Eliminar usuario |

### Customers (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/customers` | Crear cliente |
| POST | `/customers/with-address` | Crear cliente y dirección inicial |
| GET | `/customers` | Listar clientes (paginado, search) |
| GET | `/customers/:id` | Obtener cliente |
| GET | `/customers/phone/:phone` | Buscar por teléfono |
| PATCH | `/customers/:id` | Actualizar cliente |
| DELETE | `/customers/:id` | Eliminar cliente |
| GET | `/customers/:id/addresses` | Direcciones del cliente |
| POST | `/customers/:id/addresses` | Crear dirección |
| PATCH | `/customers/addresses/:addressId` | Actualizar dirección |
| DELETE | `/customers/addresses/:addressId` | Eliminar dirección |

### Tables (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/tables` | Crear mesa |
| GET | `/tables` | Listar mesas (paginado, filtro state, search) |
| GET | `/tables/available` | Mesas disponibles |
| GET | `/tables/:id` | Obtener mesa |
| PATCH | `/tables/:id` | Actualizar mesa |
| PATCH | `/tables/:id/state` | Cambiar estado (available/unavailable) |
| DELETE | `/tables/:id` | Eliminar mesa |

### Categories (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/categories` | Crear categoría |
| GET | `/categories` | Listar categorías (paginado, search) |
| GET | `/categories/:id` | Obtener categoría |
| PATCH | `/categories/:id` | Actualizar categoría |
| DELETE | `/categories/:id` | Eliminar categoría |

### Products (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/products` | Crear producto |
| GET | `/products` | Listar productos (paginado, filtros: status, categoryId, search) |
| GET | `/products/available` | Productos disponibles |
| GET | `/products/category/:categoryId` | Productos por categoría |
| GET | `/products/:id` | Obtener producto |
| PATCH | `/products/:id` | Actualizar producto |
| PATCH | `/products/:id/status` | Cambiar estado (available/unavailable) |
| DELETE | `/products/:id` | Eliminar producto |

### Orders (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/orders` | Crear orden con detalles |
| GET | `/orders` | Listar órdenes (paginado, filtros: status, search) |
| GET | `/orders/open` | Órdenes abiertas |
| GET | `/orders/:id` | Obtener orden con detalles completos |
| PATCH | `/orders/:id/status` | Cambiar estado (open, in_preparation, ready, served, canceled) |
| DELETE | `/orders/:id` | Eliminar orden (cascada) |

### Dine-In (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/dine-in` | Asignar mesa a orden |
| GET | `/dine-in` | Listar dine-in (paginado) |
| GET | `/dine-in/:orderId` | Obtener por orden |
| PATCH | `/dine-in/:orderId` | Cambiar mesa / guestCount |
| DELETE | `/dine-in/:orderId` | Liberar mesa |

### Delivery (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/delivery` | Crear orden delivery |
| POST | `/delivery/orders` | Crear pedido, detalles y domicilio en una transacción |
| GET | `/delivery` | Listar delivery |
| GET | `/delivery/:orderId` | Obtener por orden |
| GET | `/delivery/status/:status` | Filtrar por estado |
| GET | `/delivery/domiciliary/:id` | Por domiciliario |
| PATCH | `/delivery/:orderId/status` | Cambiar estado delivery |
| PATCH | `/delivery/:orderId` | Actualizar datos |
| DELETE | `/delivery/:orderId` | Eliminar |

### Order Details (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/orders/:orderId/details` | Agregar producto a orden |
| GET | `/orders/:orderId/details` | Detalles de orden |
| GET | `/orders/:orderId/details/:id` | Detalle específico |
| PATCH | `/orders/:orderId/details/:id/status` | Cambiar estado detalle |
| PATCH | `/orders/:orderId/details/:id` | Actualizar cantidad/notas |
| DELETE | `/orders/:orderId/details/:id` | Eliminar detalle |

### Order History (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/orders/history/order/:orderId` | Historial estados orden |
| GET | `/orders/history/detail/:detailId` | Historial estados detalle |
| GET | `/orders/history/user/:userId` | Actividad usuario |

### Kitchen (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/kitchen/orders` | Órdenes en cocina (open, in_preparation) |
| GET | `/kitchen/orders/:id` | Detalle orden para cocina |
| GET | `/kitchen/details/pending` | Detalles pendientes/preparando |
| PATCH | `/kitchen/details/:id/status` | Actualizar estado (pending→in_preparation→ready→served) |
| GET | `/kitchen/stats` | Estadísticas tiempos preparación |

### Invoices (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/invoices` | Crear factura |
| GET | `/invoices` | Listar facturas |
| GET | `/invoices/:id` | Obtener factura |
| GET | `/invoices/order/:orderId` | Factura por orden |
| GET | `/invoices/status/:status` | Filtrar por estado |
| GET | `/invoices/:id/with-payment` | Factura + pago |
| PATCH | `/invoices/:id/status` | Cambiar estado (draft→issued→canceled) |
| DELETE | `/invoices/:id` | Eliminar factura |

### Payments (Protegido)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/payments` | Crear pago |
| GET | `/payments/invoice/:invoiceId` | Pago por factura |
| PATCH | `/payments/invoice/:invoiceId/status` | Cambiar estado pago |
| POST | `/payments/invoice/:invoiceId/process` | Registrar un pago recibido (no procesa tarjetas con una pasarela externa) |
| POST | `/payments/invoice/:invoiceId/refund` | Reembolsar |

### Admin (Protegido - Solo admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/admin/products` | Crear producto |
| GET | `/admin/products` | Listar productos (paginado, filtros) |
| GET | `/admin/products/:id` | Obtener producto + categoría |
| PATCH | `/admin/products/:id` | Actualizar producto |
| PATCH | `/admin/products/:id/status` | Cambiar estado producto |
| DELETE | `/admin/products/:id` | Desactivar producto |
| POST | `/admin/tables` | Crear mesa |
| GET | `/admin/tables` | Listar mesas (paginado, filtros) |
| GET | `/admin/tables/:id` | Obtener mesa |
| PATCH | `/admin/tables/:id` | Actualizar mesa |
| PATCH | `/admin/tables/:id/state` | Cambiar estado mesa |
| DELETE | `/admin/tables/:id` | Desactivar mesa |
| POST | `/admin/users` | Crear usuario |
| GET | `/admin/users` | Listar usuarios (paginado, filtros) |
| GET | `/admin/users/:id` | Obtener usuario |
| PATCH | `/admin/users/:id` | Actualizar usuario |
| DELETE | `/admin/users/:id` | Cambiar rol a waiter |
| GET | `/admin/reports/sales` | Reporte ventas (filtro fechas) |
| GET | `/admin/reports/prep-times` | Reporte tiempos preparación |

## Documentación Swagger/OpenAPI

Una vez levantado el proyecto (`npm run dev`), la documentación interactiva está disponible en:

```
http://localhost:3000/api
```

También puedes descargar el spec JSON en:
```
http://localhost:3000/api-json
```

## Postman Collections

Las colecciones están en `.postman/collections/`:

```
.postman/
├── environments/
│   └── Poli-Restaurante.environment.yaml
├── globals/
│   └── workspace.globals.yaml
└── collections/
    ├── Auth/
    ├── Health/
    ├── Customers/
    ├── Users/
    ├── Tables/
    ├── Categories/
    ├── Products/
    ├── Orders/
    │   ├── Orders/
    │   ├── Dine-In/
    │   ├── Details/
    │   └── History/
    ├── Kitchen/
    ├── Delivery/
    ├── Invoices/
    ├── Payments/
    └── Admin/
```

### Importar en Postman

1. **Environment**: Import > `.postman/environments/Poli-Restaurante.environment.yaml`
2. **Collections**: Import > Seleccionar carpeta `.postman/collections/` (importa todas)
3. **Variables**: Configurar `authToken` con JWT de Supabase tras login

### Variables de entorno disponibles

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `baseUrl` | URL base API | `http://localhost:3000` |
| `authToken` | JWT Supabase | *(vacío, llenar tras login)* |
| `productId` | ID producto | `1` |
| `categoryId` | ID categoría | `1` |
| `tableId` | ID mesa | `1` |
| `userId` | ID usuario (UUID) | `uuid` |
| `orderId` | ID orden | `1` |
| `detailId` | ID detalle orden | `1` |
| `customerId` | ID cliente | `uuid` |
| `addressId` | ID dirección | `1` |
| `invoiceId` | ID factura | `1` |

## Scripts disponibles

```bash
# Desarrollo
npm run dev              # Build e iniciar backend y frontend juntos
npm run start:dev        # Solo backend en watch mode
npm run start:debug      # Debug + watch

# Build
npm run build            # Compilar a dist/
npm run typecheck        # tsc --noEmit

# Base de datos
npm run prisma:generate  # Generar Prisma Client
npm run prisma:migrate:dev   # Migraciones dev
npm run prisma:migrate:deploy # Migraciones prod
npm run prisma:migrate:status # Estado migraciones
npm run prisma:db:push   # Push schema (sin migraciones)
npm run prisma:seed      # Seed data

# Testing
npm run test             # Unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage
npm run test:e2e         # E2E tests

# Code quality
npm run lint             # Prettier check
npm run format           # Prettier write
```

## Flujo típico de órdenes

```
1. POST /orders          → Crear orden con detalles (status: open)
2. POST /dine-in         → Asignar mesa (mesa → unavailable)
3. PATCH /orders/:id/status → in_preparation
4. Kitchen: PATCH /kitchen/details/:id/status → ready → served
5. PATCH /orders/:id/status → ready → served
6. POST /invoices        → Crear factura
7. POST /payments/invoice/:id/process → Pagar (factura → issued)
8. Dine-in: mesa → available (auto al served/canceled)
```

## Roles y permisos

| Rol | Descripción |
|-----|-------------|
| `admin` | Acceso total + panel admin + reportes |
| `waiter` | Crear órdenes, dine-in, agregar detalles |
| `kitchen` | Ver cocina, actualizar estados detalles |
| `cashier` | Facturas, pagos |
| `domiciliary` | Delivery, actualizar estados delivery |

## Base de datos (Prisma Schema)

Modelos principales:
- `User` - Usuarios del sistema
- `Customer` - Clientes
- `RestaurantTable` - Mesas
- `Category` / `Product` - Menú
- `Order` + `OrderDetail` - Órdenes
- `DineInOrder` / `DeliveryOrder` - Tipos de orden
- `OrderStateHistory` / `OrderDetailStateHistory` - Auditoría
- `Invoice` / `Payment` - Facturación

## Licencia

UNLICENSED - Uso interno Poli Restaurante