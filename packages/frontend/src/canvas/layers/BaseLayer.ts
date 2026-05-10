/**
 * @file Base layer abstraction for canvas rendering
 * All canvas layers must extend this class.
 */

import { BoardMetrics } from '../types/canvas';

/**
 * Abstract base class for all canvas rendering layers.
 * Layers are rendered in order of their z-index (low to high).
 */
export abstract class BaseLayer {
  /** Layer priority - higher values render on top */
  abstract readonly zIndex: number;

  /**
   * Render this layer to the canvas.
   * @param ctx - Canvas 2D rendering context
   * @param metrics - Board layout metrics
   * @param elapsedTime - Total elapsed time since render loop start (ms)
   * @param deltaTime - Time since last frame (ms)
   */
  abstract render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    elapsedTime: number,
    deltaTime: number
  ): void;

  /**
   * Optional: Called when layer is added to renderer.
   */
  onAttach?(): void;

  /**
   * Optional: Called when layer is removed from renderer.
   */
  onDetach?(): void;
}
