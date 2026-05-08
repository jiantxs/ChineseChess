import { Piece, Side } from './types';

export interface PieceLayoutData {
  pieces: Piece[];
  firstPlayer: Side;
  name?: string;
  description?: string;
}

export class PieceLayout {
  constructor(
    private pieces: Piece[],
    private firstPlayer: Side,
    private name: string = 'custom',
    private description: string = ''
  ) {}

  static fromJSON(json: PieceLayoutData): PieceLayout {
    return new PieceLayout(
      json.pieces,
      json.firstPlayer,
      json.name,
      json.description
    );
  }

  static fromJSONString(jsonString: string): PieceLayout {
    const data = JSON.parse(jsonString) as PieceLayoutData;
    return PieceLayout.fromJSON(data);
  }

  getInitialPieces(): Piece[] {
    return this.pieces.map(p => ({ ...p, position: { ...p.position } }));
  }

  getFirstPlayer(): Side {
    return this.firstPlayer;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  toJSON(): PieceLayoutData {
    return {
      pieces: this.pieces,
      firstPlayer: this.firstPlayer,
      name: this.name,
      description: this.description,
    };
  }

  toJSONString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
