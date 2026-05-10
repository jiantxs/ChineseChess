/**
 * @file Animation engine - manages all active animations
 * Provides centralized animation lifecycle management.
 */

import { IAnimation, BoardMetrics } from '../types/canvas';

/**
 * Central manager for all canvas animations.
 * Handles animation registration, updates, and rendering.
 */
export class AnimationEngine {
  private animations: Map<string, IAnimation> = new Map();

  /**
   * Add an animation to the engine.
   * @param animation - The animation instance to manage
   */
  add(animation: IAnimation): void {
    this.animations.set(animation.id, animation);
  }

  /**
   * Remove an animation by ID.
   * @param id - Animation identifier
   */
  remove(id: string): void {
    const anim = this.animations.get(id);
    if (anim?.destroy) {
      anim.destroy();
    }
    this.animations.delete(id);
  }

  /**
   * Remove all animations.
   */
  clear(): void {
    this.animations.forEach(anim => {
      if (anim.destroy) anim.destroy();
    });
    this.animations.clear();
  }

  /**
   * Update all active animations.
   * @param deltaTime - Time since last frame (ms)
   */
  update(deltaTime: number): void {
    for (const [id, anim] of this.animations) {
      anim.update(deltaTime);
      if (!anim.isActive) {
        if (anim.destroy) anim.destroy();
        this.animations.delete(id);
      }
    }
  }

  /**
   * Render all active animations.
   * @param ctx - Canvas 2D context
   * @param metrics - Board layout metrics
   */
  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void {
    for (const anim of this.animations.values()) {
      if (anim.isActive) {
        anim.render(ctx, metrics);
      }
    }
  }

  /**
   * Get count of active animations.
   */
  get activeCount(): number {
    return this.animations.size;
  }
}
