import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.calculation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  const melamina = await prisma.category.create({ data: { name: 'Melamina' } });
  const mdf = await prisma.category.create({ data: { name: 'MDF' } });
  const osb = await prisma.category.create({ data: { name: 'OSB' } });

  const products = [
    {
      name: 'Melamina Blanca 300x200',
      description: 'Tablero melamina blanca estándar, 18mm',
      categoryId: melamina.id,
      standardWidth: 300,
      standardHeight: 200,
      thickness: 18,
      minWidth: 50,
      minHeight: 50,
      maxWidth: 300,
      maxHeight: 200,
      pricePerUnit: 95.5,
    },
    {
      name: 'Melamina Roble Natural 280x207',
      description: 'Tablero melamina acabado roble natural, 18mm',
      categoryId: melamina.id,
      standardWidth: 280,
      standardHeight: 207,
      thickness: 18,
      minWidth: 50,
      minHeight: 50,
      maxWidth: 280,
      maxHeight: 207,
      pricePerUnit: 112.0,
    },
    {
      name: 'Melamina Gris Antracita 260x186',
      description: 'Tablero melamina gris antracita, 16mm',
      categoryId: melamina.id,
      standardWidth: 260,
      standardHeight: 186,
      thickness: 16,
      minWidth: 40,
      minHeight: 40,
      maxWidth: 260,
      maxHeight: 186,
      pricePerUnit: 89.9,
    },
    {
      name: 'Melamina Blanca 244x183',
      description: 'Tablero melamina blanca, 25mm reforzado',
      categoryId: melamina.id,
      standardWidth: 244,
      standardHeight: 183,
      thickness: 25,
      minWidth: 50,
      minHeight: 50,
      maxWidth: 244,
      maxHeight: 183,
      pricePerUnit: 108.75,
    },
    {
      name: 'MDF Crudo 250x183',
      description: 'Tablero MDF sin recubrimiento, 16mm',
      categoryId: mdf.id,
      standardWidth: 250,
      standardHeight: 183,
      thickness: 16,
      minWidth: 40,
      minHeight: 40,
      maxWidth: 250,
      maxHeight: 183,
      pricePerUnit: 68.0,
    },
    {
      name: 'MDF Hidrófugo 280x207',
      description: 'Tablero MDF resistente a la humedad, 19mm',
      categoryId: mdf.id,
      standardWidth: 280,
      standardHeight: 207,
      thickness: 19,
      minWidth: 50,
      minHeight: 50,
      maxWidth: 280,
      maxHeight: 207,
      pricePerUnit: 135.4,
    },
    {
      name: 'MDF Lacado Blanco 244x183',
      description: 'Tablero MDF lacado blanco brillo, 18mm',
      categoryId: mdf.id,
      standardWidth: 244,
      standardHeight: 183,
      thickness: 18,
      minWidth: 50,
      minHeight: 50,
      maxWidth: 244,
      maxHeight: 183,
      pricePerUnit: 142.9,
    },
    {
      name: 'OSB3 Estructural 250x125',
      description: 'Tablero OSB3 para uso estructural, 18mm',
      categoryId: osb.id,
      standardWidth: 250,
      standardHeight: 125,
      thickness: 18,
      minWidth: 30,
      minHeight: 30,
      maxWidth: 250,
      maxHeight: 125,
      pricePerUnit: 58.2,
    },
    {
      name: 'OSB Ranurado 260x125',
      description: 'Tablero OSB ranurado para machihembrado, 22mm',
      categoryId: osb.id,
      standardWidth: 260,
      standardHeight: 125,
      thickness: 22,
      minWidth: 30,
      minHeight: 30,
      maxWidth: 260,
      maxHeight: 125,
      pricePerUnit: 72.5,
    },
    {
      name: 'OSB Ligero 244x122',
      description: 'Tablero OSB ligero, 12mm',
      categoryId: osb.id,
      standardWidth: 244,
      standardHeight: 122,
      thickness: 12,
      minWidth: 30,
      minHeight: 30,
      maxWidth: 244,
      maxHeight: 122,
      pricePerUnit: 45.0,
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  console.log(`Seeded 3 categories and ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
