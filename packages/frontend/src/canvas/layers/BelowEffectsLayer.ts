/**
 * @file BelowEffectsLayer - Layer 1: Effects rendered below pieces
 * Manages background animations like starfield and grid effects.
 */

import { BaseLayer } from './BaseLayer';
import { AnimationEngine } from '../animations/AnimationEngine';
import { BoardMetrics } from '../types/canvas';

/**
 * Layer 1: Renders animated effects below the chess pieces.
 * Includes starfield and animated grid lines.
 */
export class BelowEffectsLayer extends BaseLayer {
  readonly zIndex = 1;
  private animEngine: AnimationEngine;

  constructor(animEngine: AnimationEngine) {
    super();
    this.animEngine = animEngine;
  }

  render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    _elapsedTime: number,
    _deltaTime: number
  ): void {
    // Render all below-piece animations
    this.animEngine.render(ctx, metrics);
  }
}
