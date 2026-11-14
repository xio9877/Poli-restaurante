import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const categories = [
    { id: 1, name: 'Bebidas', description: 'Bebidas frías y calientes' },
    { id: 2, name: 'Platos Fuertes', description: 'Platos principales' },
    { id: 3, name: 'Entradas', description: 'Entradas y aperitivos' },
    { id: 4, name: 'Postres', description: 'Postres y dulces' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      create: category,
      update: { name: category.name, description: category.description },
    });
  }

  const products = [
    { id: 1, categoryId: 1, name: 'Agua Mineral', description: 'Botella 500ml', price: 2000 },
    { id: 2, categoryId: 1, name: 'Gaseosa', description: 'Coca Cola 350ml', price: 3000 },
    {
      id: 3,
      categoryId: 1,
      name: 'Jugo Natural',
      description: 'Jugo de maracuyá 300ml',
      price: 4000,
    },
    {
      id: 4,
      categoryId: 2,
      name: 'Bandeja Paisa',
      description: 'Tradicional bandeja paisa',
      price: 25000,
    },
    { id: 5, categoryId: 2, name: 'Ajiaco', description: 'Ajiaco santafereño', price: 22000 },
    {
      id: 6,
      categoryId: 3,
      name: 'Empanadas',
      description: 'Empanadas de carne (3 und)',
      price: 8000,
    },
    { id: 7, categoryId: 4, name: 'Flan', description: 'Flan de leche condensada', price: 6000 },
    {
      id: 8,
      categoryId: 4,
      name: 'Torta de Chocolate',
      description: 'Porción de torta tres leches',
      price: 7000,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      create: { ...product, status: 'available' },
      update: {
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        price: product.price,
        status: 'available',
      },
    });
  }

  for (let id = 1; id <= 15; id++) {
    const capacity = id <= 10 ? 4 : 2;
    await prisma.restaurantTable.upsert({
      where: { id },
      create: {
        id,
        name: `Mesa ${id}`,
        description: `Mesa para ${capacity} personas`,
        state: 'available',
      },
      update: {
        name: `Mesa ${id}`,
        description: `Mesa para ${capacity} personas`,
        state: 'available',
      },
    });
  }

  console.log('✅ Seed completado');
  console.log(`   Categorías: 4`);
  console.log(`   Productos: 8`);
  console.log(`   Mesas: 15`);
}

main()
  .catch((error) => {
    console.error('❌ Error en seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
