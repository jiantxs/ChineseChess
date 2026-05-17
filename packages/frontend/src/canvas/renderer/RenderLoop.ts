/**
 * @file 使用 requestAnimationFrame 的渲染循环管理器
 * 管理画布动画的连续渲染周期。
 */

export type RenderCallback = (deltaTime: number, elapsedTime: number) => void;

/**
 * 管理画布渲染的 requestAnimationFrame 循环。
 * 提供带增量时间计算的平滑动画计时。
 */
export class RenderLoop {
  private animationId: number | null = null;
  private lastTimestamp: number = 0;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private callbacks: Set<RenderCallback> = new Set();

  /**
   * 注册每个动画帧调用的回调。
   * @param callback - 接收 (deltaTime, elapsedTime) 的函数
   * @returns 取消注册函数
   */
  onFrame(callback: RenderCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 启动渲染循环。
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now();
    this.lastTimestamp = this.startTime;
    this.tick(this.startTime);
  }

  /**
   * 停止渲染循环。
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 检查循环是否正在运行。
   */
  get running(): boolean {
    return this.isRunning;
  }

  private tick = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    const elapsedTime = timestamp - this.startTime;

    // 通知所有已注册的回调
    this.callbacks.forEach(cb => cb(deltaTime, elapsedTime));

    this.animationId = requestAnimationFrame(this.tick);
  };
}
