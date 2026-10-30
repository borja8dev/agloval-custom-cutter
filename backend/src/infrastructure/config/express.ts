import express, { Express } from 'express';
import cors from 'cors';
import { createCalculationRoutes } from '../web/routes/calculations.routes';
import { createOrderRoutes } from '../web/routes/orders.routes';
import { createQuoteRoutes } from '../web/routes/quotes.routes';
import { createFamilyRoutes, createProductRoutes } from '../web/routes/products.routes';
import { CalculationController } from '../web/controllers/CalculationController';
import { OrderQuoteController } from '../web/controllers/OrderQuoteController';
import { OrderSubmitController } from '../web/controllers/OrderSubmitController';
import { QuoteSubmitController } from '../web/controllers/QuoteSubmitController';
import { ProductController } from '../web/controllers/ProductController';
import { requestLogger, responseTime } from '../web/middleware/logging';
import { errorHandler } from '../web/middleware/errorHandler';
import { RateLimitOptions, createRateLimit } from '../web/middleware/rateLimit';
import { ICalculateUseCase } from '../../application/ports/in/CalculateUseCase';
import { IProductUseCase } from '../../application/ports/in/ProductUseCase';
import { IOrderQuoteUseCase } from '../../application/ports/in/OrderQuoteUseCase';
import { IOrderSubmitUseCase } from '../../application/ports/in/OrderSubmitUseCase';
import { IQuoteSubmitUseCase } from '../../application/ports/in/QuoteSubmitUseCase';

export interface AppDependencies {
  calculationUseCase: ICalculateUseCase;
  productUseCase: IProductUseCase;
  orderQuoteUseCase: IOrderQuoteUseCase;
  orderSubmitUseCase: IOrderSubmitUseCase;
  quoteSubmitUseCase: IQuoteSubmitUseCase;
  /**
   * One per-IP budget shared by POST /api/orders/submit and POST /api/quotes/submit;
   * defaults to 5 per 10 minutes.
   */
  submitRateLimit?: RateLimitOptions;
}

export function createExpressApp({
  calculationUseCase,
  productUseCase,
  orderQuoteUseCase,
  orderSubmitUseCase,
  quoteSubmitUseCase,
  submitRateLimit,
}: AppDependencies): Express {
  const app = express();

  // Behind Render's proxy every request comes from the proxy; trusting one hop
  // makes req.ip the real client, so the submit limit counts per customer.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

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
  const orderQuoteController = new OrderQuoteController(orderQuoteUseCase);
  const orderSubmitController = new OrderSubmitController(orderSubmitUseCase);
  const quoteSubmitController = new QuoteSubmitController(quoteSubmitUseCase);

  // One limiter instance: both routes that send emails draw from the same budget per IP.
  const submitLimiter = createRateLimit(submitRateLimit);

  app.use('/api/calculations', createCalculationRoutes(calculationController));
  app.use('/api/products', createProductRoutes(productController));
  app.use(
    '/api/orders',
    createOrderRoutes(orderQuoteController, orderSubmitController, submitLimiter)
  );
  app.use('/api/quotes', createQuoteRoutes(quoteSubmitController, submitLimiter));
  app.use('/api/families', createFamilyRoutes(productController));

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
