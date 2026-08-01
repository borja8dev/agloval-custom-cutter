import { Piece, BoardDimensions, CalculationResult } from '../types';
import {
  InvalidPieceException,
  EmptyPiecesListException,
  InvalidBoardDimensionsException,
} from '../exceptions/DomainException';

export class CuttingCalculator {
  private readonly boardDimensions: BoardDimensions;
  private readonly boardArea: number; // m²
  private readonly minPieceDimension: number = 10; // cm (machine cutting constraint)
  private readonly maxPieceWidth: number; // cm (board width)
  private readonly maxPieceHeight: number; // cm (board height)

  constructor(boardDimensions: BoardDimensions) {
    this.validateBoardDimensions(boardDimensions);
    this.boardDimensions = boardDimensions;
    this.boardArea = this.cmToM2(boardDimensions.width * boardDimensions.height);
    this.maxPieceWidth = boardDimensions.width;
    this.maxPieceHeight = boardDimensions.height;
  }

  /**
   * @throws EmptyPiecesListException
   * @throws InvalidPieceException
   */
  calculate(pieces: Piece[]): CalculationResult {
    if (!pieces || pieces.length === 0) {
      throw new EmptyPiecesListException();
    }

    let firstInvalidPiece: Piece | null = null;
    const validationErrors: string[] = [];
    pieces.forEach((piece, index) => {
      const errors = this.validatePiece(piece);
      if (errors.length > 0) {
        if (!firstInvalidPiece) {
          firstInvalidPiece = piece;
        }
        validationErrors.push(`Piece ${index}: ${errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      throw new InvalidPieceException(firstInvalidPiece, validationErrors.join('; '));
    }

    const totalAreaNeeded = this.calculateTotalArea(pieces);
    const boardsNeeded = this.calculateBoardsNeeded(totalAreaNeeded);
    const wastePercentage = this.calculateWastePercentage(totalAreaNeeded, boardsNeeded);
    const averagePieceSize = totalAreaNeeded / pieces.length;

    return {
      requestedPieces: pieces,
      boardDimensions: this.boardDimensions,
      totalAreaNeeded: Number(totalAreaNeeded.toFixed(4)),
      boardArea: Number(this.boardArea.toFixed(4)),
      boardsNeeded: Number(boardsNeeded.toFixed(2)),
      wastePercentage: Number(wastePercentage.toFixed(2)),
      pieceCount: pieces.length,
      averagePieceSize: Number(averagePieceSize.toFixed(4)),
      isValid: true,
      errors: [],
    };
  }

  /**
   * @returns Array of error messages (empty = valid)
   */
  private validatePiece(piece: Piece): string[] {
    const errors: string[] = [];

    if (!piece || typeof piece !== 'object') {
      errors.push('Piece must be an object');
      return errors;
    }

    if (typeof piece.width !== 'number' || piece.width <= 0) {
      errors.push(`Width must be a positive number, got ${piece.width}`);
    }

    if (typeof piece.height !== 'number' || piece.height <= 0) {
      errors.push(`Height must be a positive number, got ${piece.height}`);
    }

    if (piece.width < this.minPieceDimension) {
      errors.push(`Width (${piece.width}cm) below minimum (${this.minPieceDimension}cm)`);
    }

    if (piece.height < this.minPieceDimension) {
      errors.push(`Height (${piece.height}cm) below minimum (${this.minPieceDimension}cm)`);
    }

    if (piece.width > this.maxPieceWidth) {
      errors.push(`Width (${piece.width}cm) exceeds board width (${this.maxPieceWidth}cm)`);
    }

    if (piece.height > this.maxPieceHeight) {
      errors.push(`Height (${piece.height}cm) exceeds board height (${this.maxPieceHeight}cm)`);
    }

    return errors;
  }

  private calculateTotalArea(pieces: Piece[]): number {
    const totalCm2 = pieces.reduce((sum, piece) => sum + piece.width * piece.height, 0);
    return this.cmToM2(totalCm2);
  }

  /**
   * Ceiling to 0.1: 1.05 → 1.1, 1.15 → 1.2
   */
  private calculateBoardsNeeded(totalAreaNeeded: number): number {
    const boardsExact = totalAreaNeeded / this.boardArea;
    return Math.ceil(boardsExact * 10) / 10;
  }

  /**
   * waste% relative to the area actually purchased (boardsNeeded * boardArea),
   * not a hypothetical single full board.
   */
  private calculateWastePercentage(totalAreaNeeded: number, boardsNeeded: number): number {
    const usedArea = boardsNeeded * this.boardArea;
    const waste = usedArea - totalAreaNeeded;
    return (waste / usedArea) * 100;
  }

  private cmToM2(cm2: number): number {
    return cm2 / 10000; // 1 m² = 10,000 cm²
  }

  private validateBoardDimensions(dims: BoardDimensions): void {
    if (
      !dims ||
      typeof dims !== 'object' ||
      typeof dims.width !== 'number' ||
      dims.width <= 0 ||
      typeof dims.height !== 'number' ||
      dims.height <= 0
    ) {
      throw new InvalidBoardDimensionsException(dims ?? {});
    }
  }
}
