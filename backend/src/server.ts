import 'dotenv/config';
import { createExpressApp } from './infrastructure/config/express';
import { CalculationApplicationService } from './application/services/CalculationApplicationService';
import { ProductUseCaseAdapter } from './application/services/ProductUseCaseAdapter';
import { ProductRepository } from './infrastructure/persistence/repositories/ProductRepository';
import { CalculationRepository } from './infrastructure/persistence/repositories/CalculationRepository';
import { getPrismaClient, disconnectPrisma, healthCheck } from './infrastructure/config/database';

async function main(): Promise<void> {
  const dbHealth = await healthCheck();
  if (!dbHealth.healthy) {
    console.error('Database connection failed:', dbHealth.message);
    process.exit(1);
  }
  console.log(dbHealth.message);

  const prisma = getPrismaClient();

  const productRepository = new ProductRepository(prisma);
  const calculationRepository = new CalculationRepository(prisma);

  const calculationService = new CalculationApplicationService(
    productRepository,
    calculationRepository
  );
  const productUseCase = new ProductUseCaseAdapter(productRepository);

  const app = createExpressApp(calculationService, productUseCase);

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
