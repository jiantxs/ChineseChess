/**
 * @file Base animation class with common utilities
 * Provides foundation for all canvas animations.
 */

import { IAnimation, BoardMetrics } from '../types/canvas';

/**
 * Abstract base class for canvas animations.
 * Implements common animation lifecycle and utility methods.
 */
export abstract class BaseAnimation implements IAnimation {
  readonly id: string;
  isActive: boolean = true;
  protected elapsedTime: number = 0;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Update animation state. Subclasses should call super.update().
   * @param deltaTime - Time since last frame (ms)
   */
  update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
  }

  /**
   * Render animation. Must be implemented by subclass.
   */
  abstract render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void;

  /**
   * Mark animation as complete and ready for removal.
   */
  complete(): void {
    this.isActive = false;
  }

  /**
   * Utility: Linear interpolation between two values.
   */
  protected lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Utility: Clamp value between min and max.
   */
  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Utility: Ease-in-out function.
   */
  protected easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * Utility: Sine wave oscillation.
   */
  protected oscillate(frequency: number, amplitude: number = 1, offset: number = 0): number {
    return Math.sin(this.elapsedTime * frequency + offset) * amplitude;
  }

  destroy?(): void {
    // Override in subclass if cleanup needed
  }
}
