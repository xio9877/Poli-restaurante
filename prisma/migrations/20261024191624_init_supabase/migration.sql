-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'waiter', 'kitchen', 'cashier', 'domiciliary');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('available', 'unavailable');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('available', 'unavailable');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('open', 'in_preparation', 'ready', 'served', 'canceled');

-- CreateEnum
CREATE TYPE "OrderDetailStatus" AS ENUM ('pending', 'in_preparation', 'ready', 'served', 'canceled');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'assigned', 'picked_up', 'delivered', 'canceled');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'canceled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'debit_card', 'credit_card', 'transfer', 'other');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(70) NOT NULL,
    "username" VARCHAR(70) NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(70) NOT NULL,
    "username" VARCHAR(70) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" SERIAL NOT NULL,
    "id_customer" TEXT NOT NULL,
    "label" VARCHAR(70) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "additional_info" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "state" "TableStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "id_category" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'open',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dine_in_orders" (
    "id_order" INTEGER NOT NULL,
    "id_table" INTEGER NOT NULL,
    "id_waiter" TEXT NOT NULL,
    "guest_count" INTEGER,

    CONSTRAINT "dine_in_orders_pkey" PRIMARY KEY ("id_order")
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id_order" INTEGER NOT NULL,
    "id_customer" TEXT NOT NULL,
    "id_address" INTEGER NOT NULL,
    "id_domiciliary" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "delivery_fee" DECIMAL(12,2),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id_order")
);

-- CreateTable
CREATE TABLE "order_detail" (
    "id" SERIAL NOT NULL,
    "id_order" INTEGER NOT NULL,
    "id_product" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "state" "OrderDetailStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),

    CONSTRAINT "order_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_state_history" (
    "id" SERIAL NOT NULL,
    "id_order" INTEGER NOT NULL,
    "id_user" TEXT NOT NULL,
    "notes" TEXT,
    "old_state" "OrderStatus",
    "new_state" "OrderStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_detail_state_history" (
    "id" SERIAL NOT NULL,
    "id_order_detail" INTEGER NOT NULL,
    "id_user" TEXT NOT NULL,
    "notes" TEXT,
    "old_state" "OrderDetailStatus",
    "new_state" "OrderDetailStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_detail_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "id_order" INTEGER NOT NULL,
    "id_cashier" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "issued_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id_invoice" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id_invoice")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "customers_username_key" ON "customers"("username");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_id_order_key" ON "invoices"("id_order");

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_id_customer_fkey" FOREIGN KEY ("id_customer") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dine_in_orders" ADD CONSTRAINT "dine_in_orders_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dine_in_orders" ADD CONSTRAINT "dine_in_orders_id_table_fkey" FOREIGN KEY ("id_table") REFERENCES "restaurant_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dine_in_orders" ADD CONSTRAINT "dine_in_orders_id_waiter_fkey" FOREIGN KEY ("id_waiter") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_id_customer_fkey" FOREIGN KEY ("id_customer") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_id_address_fkey" FOREIGN KEY ("id_address") REFERENCES "customer_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_id_domiciliary_fkey" FOREIGN KEY ("id_domiciliary") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_detail" ADD CONSTRAINT "order_detail_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_detail" ADD CONSTRAINT "order_detail_id_product_fkey" FOREIGN KEY ("id_product") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_state_history" ADD CONSTRAINT "order_state_history_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_state_history" ADD CONSTRAINT "order_state_history_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_detail_state_history" ADD CONSTRAINT "order_detail_state_history_id_order_detail_fkey" FOREIGN KEY ("id_order_detail") REFERENCES "order_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_detail_state_history" ADD CONSTRAINT "order_detail_state_history_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_id_cashier_fkey" FOREIGN KEY ("id_cashier") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_id_invoice_fkey" FOREIGN KEY ("id_invoice") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
