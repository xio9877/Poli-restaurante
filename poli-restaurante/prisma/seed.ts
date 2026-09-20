import { PrismaClient, UserRole, TableStatus, ProductStatus, OrderStatus, OrderDetailStatus, DeliveryStatus, InvoiceStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Categorías
  const bebidas = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Bebidas', description: 'Bebidas frías y calientes' },
  });

  const platosFuertes = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Platos Fuertes', description: 'Platos principales' },
  });

  const entradas = await prisma.category.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: 'Entradas', description: 'Entradas y aperitivos' },
  });

  const postres = await prisma.category.upsert({
    where: { id: 4 },
    update: {},
    create: { id: 4, name: 'Postres', description: 'Postres y dulces' },
  });

  // Productos
  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, categoryId: bebidas.id, name: 'Agua Mineral', description: 'Botella 500ml', price: 2000, status: ProductStatus.available },
  });

  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, categoryId: bebidas.id, name: 'Gaseosa', description: 'Coca Cola 350ml', price: 3000, status: ProductStatus.available },
  });

  await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, categoryId: bebidas.id, name: 'Jugo Natural', description: 'Jugo de maracuyá 300ml', price: 4000, status: ProductStatus.available },
  });

  await prisma.product.upsert({
    where: { id: 4 },
    update: {},
    create: { id: 4, categoryId: platosFuertes.id, name: 'Bandeja Paisa', description: 'Tradicional bandeja paisa', price: 25000, status: ProductStatus.available },
  });

  await prisma.product.upsert({
    where: { id: 5 },
    update: {},
    create: { id: 5, categoryId: platosFuertes.id, name: 'Ajiaco', description: 'Ajiaco santafereño', price: 22000, status: ProductStatus.available },
  });

  await prisma.product.upsert({
    where: { id: 6 },
    update: {},
    create: { id: 6, categoryId: entradas.id, name: 'Empanadas', description: 'Empanadas de carne (3 und)', price: 8000, status: ProductStatus.available },
  });

  await prisma.product.upsert({
    where: { id: 7 },
    update: {},
    create: { id: 7, categoryId: postres.id, name: 'Flan', description: 'Flan de leche condensada', price: 6000, status: ProductStatus.available },
  });

  await prisma.product.upsert({
    where: { id: 8 },
    update: {},
    create: { id: 8, categoryId: postres.id, name: 'Torta de Chocolate', description: 'Porción de torta tres leches', price: 7000, status: ProductStatus.available },
  });

  // Mesas
  for (let i = 1; i <= 10; i++) {
    await prisma.restaurantTable.upsert({
      where: { id: i },
      update: {},
      create: { id: i, name: `Mesa ${i}`, description: `Mesa para 4 personas`, state: TableStatus.available },
    });
  }

  // Mesas adicionales
  for (let i = 11; i <= 15; i++) {
    await prisma.restaurantTable.upsert({
      where: { id: i },
      update: {},
      create: { id: i, name: `Mesa ${i}`, description: `Mesa para 2 personas`, state: TableStatus.available },
    });
  }

  console.log('✅ Seed completado');
  console.log(`   Categorías: 4`);
  console.log(`   Productos: 8`);
  console.log(`   Mesas: 15`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });