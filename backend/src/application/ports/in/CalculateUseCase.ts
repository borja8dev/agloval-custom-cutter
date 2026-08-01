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

  /**
   * Recomputes area/boards/price from the new pieces — does not accept
   * raw totals from the caller.
   * @throws CalculationNotFoundException
   * @throws InvalidCalculationStatusException if the calculation isn't DRAFT
   * @throws InvalidPieceException
   */
  updateCalculation(
    calculationId: string,
    requestedPieces: Array<{ width: number; height: number }>
  ): Promise<CalculationResponseDTO>;

  /**
   * @throws CalculationNotFoundException
   * @throws InvalidCalculationStatusException if the calculation isn't DRAFT
   */
  deleteCalculation(calculationId: string): Promise<void>;
}
