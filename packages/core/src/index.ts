/**
 * Core package exports
 *
 * Re-exports all types, game logic, piece layout, and game logger.
 * Exports GameManager class for creating independent instances.
 * Single entry point for @chess/core imports.
 *
 * @module @chess/core
 * @fileoverview Core package exports for Chinese Chess
 */

export * from './types';
export * from './gameLogic';
export * from './pieceLayout';
export * from './gameLogger';
export * from './ai';
export { GameManager } from './gameManager';
