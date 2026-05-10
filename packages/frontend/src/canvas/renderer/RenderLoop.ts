/**
 * @file Render loop manager using requestAnimationFrame
 * Manages the continuous rendering cycle for canvas animations.
 */

export type RenderCallback = (deltaTime: number, elapsedTime: number) => void;

/**
 * Manages the requestAnimationFrame loop for canvas rendering.
 * Provides smooth animation timing with delta time calculations.
 */
export class RenderLoop {
  private animationId: number | null = null;
  private lastTimestamp: number = 0;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private callbacks: Set<RenderCallback> = new Set();

  /**
   * Register a callback to be called on each animation frame.
   * @param callback - Function receiving (deltaTime, elapsedTime)
   * @returns Unregister function
   */
  onFrame(callback: RenderCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Start the render loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now();
    this.lastTimestamp = this.startTime;
    this.tick(this.startTime);
  }

  /**
   * Stop the render loop.
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Check if the loop is currently running.
   */
  get running(): boolean {
    return this.isRunning;
  }

  private tick = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    const elapsedTime = timestamp - this.startTime;

    // Notify all registered callbacks
    this.callbacks.forEach(cb => cb(deltaTime, elapsedTime));

    this.animationId = requestAnimationFrame(this.tick);
  };
}
