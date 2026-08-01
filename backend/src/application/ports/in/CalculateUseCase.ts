import { CalculationRequestDTO } from '../../dto/CalculationRequest';
import { CalculationResponseDTO } from '../../dto/CalculationResponse';

/**
 * Input port (Hexagonal pattern): the contract infrastructure (Express
 * controllers) calls, implemented by CalculationApplicationService.
 */
export interface ICalculateUseCase {
  /**
   * @throws ProductNotFoundException
   * @throws InvalidPieceException
   */
  calculate(request: CalculationRequestDTO): Promise<CalculationResponseDTO>;

  /**
   * @throws CalculationNotFoundException
   */
  getCalculation(calculationId: string): Promise<CalculationResponseDTO>;

  listUserCalculations(userId: string, limit?: number): Promise<CalculationResponseDTO[]>;
}
