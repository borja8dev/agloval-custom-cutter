export abstract class DomainException extends Error {
  public readonly code: string;
  public readonly statusCode: number = 400;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class InvalidPieceException extends DomainException {
  constructor(piece: { width?: number; height?: number } | null | undefined, reason: string) {
    super(`Invalid piece: ${JSON.stringify(piece)}. Reason: ${reason}`, 'INVALID_PIECE', 400);
  }
}

export class InsufficientBoardAreaException extends DomainException {
  constructor(totalAreaNeeded: number, boardArea: number, boardsAvailable: number = 1) {
    super(
      `Total area needed (${totalAreaNeeded.toFixed(2)} m²) exceeds ` +
        `available boards capacity (${(boardArea * boardsAvailable).toFixed(2)} m²)`,
      'INSUFFICIENT_BOARD_AREA',
      400
    );
  }
}

export class EmptyPiecesListException extends DomainException {
  constructor() {
    super('At least one piece must be provided for calculation', 'EMPTY_PIECES_LIST', 400);
  }
}

export class InvalidBoardDimensionsException extends DomainException {
  constructor(dims: { width?: number; height?: number }) {
    super(
      `Invalid board dimensions: width=${dims.width}, height=${dims.height}`,
      'INVALID_BOARD_DIMENSIONS',
      400
    );
  }
}
