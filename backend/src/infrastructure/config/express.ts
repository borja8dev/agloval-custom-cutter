import express, { Express } from 'express';
import cors from 'cors';
import { createCalculationRoutes } from '../web/routes/calculations.routes';
import { createProductRoutes } from '../web/routes/products.routes';
import { CalculationController } from '../web/controllers/CalculationController';
import { ProductController } from '../web/controllers/ProductController';
import { requestLogger, responseTime } from '../web/middleware/logging';
import { errorHandler } from '../web/middleware/errorHandler';
import { ICalculateUseCase } from '../../application/ports/in/CalculateUseCase';
import { IProductUseCase } from '../../application/ports/in/ProductUseCase';

export function createExpressApp(
  calculationUseCase: ICalculateUseCase,
  productUseCase: IProductUseCase
): Express {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.use(requestLogger);
  app.use(responseTime);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const calculationController = new CalculationController(calculationUseCase);
  const productController = new ProductController(productUseCase);

  app.use('/api/calculations', createCalculationRoutes(calculationController));
  app.use('/api/products', createProductRoutes(productController));

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Must be the last middleware registered.
  app.use(errorHandler);

  return app;
}
