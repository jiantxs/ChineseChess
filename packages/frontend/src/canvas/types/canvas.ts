/**
 * @file Canvas animation system shared types
 */

/** 2D position on canvas */
export interface Point {
  x: number;
  y: number;
}

/** Animation layer type - determines render order relative to pieces */
export type LayerType = 'below' | 'above';

/** Board dimensions and layout info passed to layers */
export interface BoardMetrics {
  width: number;
  height: number;
  cellSize: number;
  padding: number;
  pieceSize: number;
  cols: number;
  rows: number;
}

/** Animation state snapshot passed each frame */
export interface FrameContext {
  /** Canvas 2D rendering context */
  ctx: CanvasRenderingContext2D;
  /** Time elapsed since animation start (ms) */
  elapsedTime: number;
  /** Delta time since last frame (ms) */
  deltaTime: number;
  /** Board layout metrics */
  metrics: BoardMetrics;
  /** Current game state (optional, for context-aware animations) */
  // gameState will be added when needed
}

/** Base animation interface */
export interface IAnimation {
  /** Unique identifier */
  id: string;
  /** Whether animation is still active */
  isActive: boolean;
  /** Update animation state */
  update(deltaTime: number): void;
  /** Render animation to canvas */
  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void;
  /** Called when animation completes or is removed */
  destroy?(): void;
}

/** Layer render priority (higher = drawn later/on top) */
export type ZIndex = 0 | 1 | 2 | 3;

/** Star object for starfield animation */
export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  glowType: 'none' | 'bar' | 'circle';
  glowColor: string;
}
