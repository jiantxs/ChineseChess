/**
 * @file LayeredRenderer - Central canvas rendering coordinator
 * Manages multiple layers and animation engine with a single render loop.
 */

import { BaseLayer } from '../layers/BaseLayer';
import { AnimationEngine } from '../animations/AnimationEngine';
import { RenderLoop } from '../renderer/RenderLoop';
import { BoardMetrics } from '../types/canvas';

/**
 * Coordinates multi-layer canvas rendering with animation support.
 * Manages the render loop, layers, and animation engine.
 */
export class LayeredRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layers: BaseLayer[] = [];
  private animEngine: AnimationEngine;
  private renderLoop: RenderLoop;
  private metrics: BoardMetrics;
  private unsubscribeFrame: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, metrics: BoardMetrics, animEngine: AnimationEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.metrics = metrics;
    this.animEngine = animEngine;
    this.renderLoop = new RenderLoop();

    // Set canvas size
    this.canvas.width = metrics.width;
    this.canvas.height = metrics.height;
  }

  /**
   * Add a rendering layer. Layers are sorted by z-index automatically.
   * @param layer - The layer to add
   */
  addLayer(layer: BaseLayer): void {
    this.layers.push(layer);
    // Sort by z-index (ascending - lower z-index drawn first)
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
    layer.onAttach?.();
  }

  /**
   * Remove a layer.
   * @param layer - The layer to remove
   */
  removeLayer(layer: BaseLayer): void {
    const index = this.layers.indexOf(layer);
    if (index >= 0) {
      this.layers.splice(index, 1);
      layer.onDetach?.();
    }
  }

  /**
   * Get the animation engine for adding/removing animations.
   */
  get animationEngine(): AnimationEngine {
    return this.animEngine;
  }

  /**
   * Update board metrics (e.g., on resize).
   * @param metrics - New board metrics
   */
  setMetrics(metrics: BoardMetrics): void {
    this.metrics = metrics;
    this.canvas.width = metrics.width;
    this.canvas.height = metrics.height;
  }

  /**
   * Start the render loop.
   */
  start(): void {
    if (this.unsubscribeFrame) return;

    this.unsubscribeFrame = this.renderLoop.onFrame((deltaTime, elapsedTime) => {
      this.render(deltaTime, elapsedTime);
    });
    this.renderLoop.start();
  }

  /**
   * Stop the render loop.
   */
  stop(): void {
    this.renderLoop.stop();
    if (this.unsubscribeFrame) {
      this.unsubscribeFrame();
      this.unsubscribeFrame = null;
    }
  }

  /**
   * Perform a single render frame.
   * Called automatically by the render loop.
   */
  private render(deltaTime: number, elapsedTime: number): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.metrics.width, this.metrics.height);

    // Update animations
    this.animEngine.update(deltaTime);

    // Render layers in order
    for (const layer of this.layers) {
      layer.render(this.ctx, this.metrics, elapsedTime, deltaTime);
    }
  }

  /**
   * Check if renderer is currently running.
   */
  get isRunning(): boolean {
    return this.renderLoop.running;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.stop();
    this.animEngine.clear();
    this.layers.forEach(layer => layer.onDetach?.());
    this.layers = [];
  }
}
