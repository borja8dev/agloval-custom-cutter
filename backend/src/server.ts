import 'dotenv/config';
import { createExpressApp } from './infrastructure/config/express';
import { CalculationApplicationService } from './application/services/CalculationApplicationService';
import { QuoteOrderService } from './application/services/QuoteOrderService';
import { SubmitOrderService } from './application/services/SubmitOrderService';
import { SubmitQuoteService } from './application/services/SubmitQuoteService';
import { createOrderNotifier } from './infrastructure/mail/createOrderNotifier';
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

  const orderQuoteService = new QuoteOrderService(productRepository);

  // No ORDER_NOTIFICATION_EMAIL means Agloval receives nothing; without SMTP_HOST
  // emails are only logged. In development SMTP_HOST points at Mailpit.
  const orderNotifier = createOrderNotifier(process.env);
  const orderSubmitService = new SubmitOrderService(orderQuoteService, orderNotifier, {
    aglovalEmail: process.env.ORDER_NOTIFICATION_EMAIL,
  });
  // Quotes only ever email the customer, so they take no Agloval address.
  const quoteSubmitService = new SubmitQuoteService(orderQuoteService, orderNotifier);

  const app = createExpressApp({
    calculationUseCase: calculationService,
    productUseCase,
    orderQuoteUseCase: orderQuoteService,
    orderSubmitUseCase: orderSubmitService,
    quoteSubmitUseCase: quoteSubmitService,
  });

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
