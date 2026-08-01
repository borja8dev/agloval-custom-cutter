import 'dotenv/config';
import { createExpressApp } from './infrastructure/config/express';
import { CalculationApplicationService } from './application/services/CalculationApplicationService';
import { IProductRepository, ICalculationRepository } from './application/ports/out/CalculationPersistence';
import { IProductUseCase } from './application/ports/in/ProductUseCase';

/**
 * TODO (Phase B.3): replace with real Prisma repositories. save()/update()
 * can't trivially satisfy their non-nullable CalculationRecord return type
 * with a stub, so they throw instead of faking a record.
 */
const productRepository: IProductRepository = {
  findById: async () => null,
  findAll: async () => [],
  findByCategory: async () => [],
};

const calculationRepository: ICalculationRepository = {
  save: async () => {
    throw new Error('Not implemented until Phase B.3');
  },
  findById: async () => null,
  findByUserId: async () => [],
  update: async () => {
    throw new Error('Not implemented until Phase B.3');
  },
  delete: async () => {},
};

const productUseCase: IProductUseCase = {
  getAll: async () => [],
  getById: async () => null,
  search: async () => [],
};

const calculationService = new CalculationApplicationService(productRepository, calculationRepository);

const app = createExpressApp(calculationService, productUseCase);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
