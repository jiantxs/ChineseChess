/**
 * Board layout helper for Chinese Chess
 *
 * Usage: Create PieceLayout instances to represent initial board setups
 * Supports JSON serialization/deserialization for persistence
 * Used by game-records package for layout registry
 *
 * @module PieceLayout
 * @fileoverview Board layout helper for Chinese Chess
 */

import { Piece, Side } from './types';

/**
 * Data structure for serializing/deserializing piece layouts
 */
export interface PieceLayoutData {
  /** Array of pieces on the board */
  pieces: Piece[];
  /** Which side moves first (RED or BLACK) */
  firstPlayer: Side;
  /** Optional layout name */
  name?: string;
  /** Optional layout description */
  description?: string;
}

/**
 * Represents a board layout configuration for Chinese Chess
 *
 * Used to define initial piece positions, which side moves first,
 * and metadata about the layout (name, description).
 */
export class PieceLayout {
  /**
   * Creates a new PieceLayout instance
   * @param pieces - Array of pieces defining the initial board setup
   * @param firstPlayer - Which side moves first (RED or BLACK)
   * @param name - Layout name (default: 'custom')
   * @param description - Layout description (default: '')
   */
  constructor(
    private pieces: Piece[],
    private firstPlayer: Side,
    private name: string = 'custom',
    private description: string = ''
  ) {}

  /**
   * Creates a PieceLayout from a PieceLayoutData object
   * @param json - The PieceLayoutData object to deserialize
   * @returns A new PieceLayout instance
   */
  static fromJSON(json: PieceLayoutData): PieceLayout {
    return new PieceLayout(
      json.pieces,
      json.firstPlayer,
      json.name,
      json.description
    );
  }

  /**
   * Creates a PieceLayout from a JSON string
   * @param jsonString - JSON string to parse
   * @returns A new PieceLayout instance
   */
  static fromJSONString(jsonString: string): PieceLayout {
    const data = JSON.parse(jsonString) as PieceLayoutData;
    return PieceLayout.fromJSON(data);
  }

  /**
   * Returns a copy of the initial pieces array
   * @returns Array of pieces with deep-copied positions
   */
  getInitialPieces(): Piece[] {
    return this.pieces.map(p => ({ ...p, position: { ...p.position } }));
  }

  /**
   * Returns which side moves first
   * @returns The first player side (RED or BLACK)
   */
  getFirstPlayer(): Side {
    return this.firstPlayer;
  }

  /**
   * Returns the layout name
   * @returns The name of this layout
   */
  getName(): string {
    return this.name;
  }

  /**
   * Returns the layout description
   * @returns The description of this layout
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Serializes the layout to a PieceLayoutData object
   * @returns A plain object representation of this layout
   */
  toJSON(): PieceLayoutData {
    return {
      pieces: this.pieces,
      firstPlayer: this.firstPlayer,
      name: this.name,
      description: this.description,
    };
  }

  /**
   * Serializes the layout to a formatted JSON string
   * @returns JSON string representation of this layout
   */
  toJSONString(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
