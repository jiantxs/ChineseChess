/**
 * @file 带公共工具的基类动画
 * 为所有画布动画提供基础。
 */

import { IAnimation, BoardMetrics } from '../types/canvas';

/**
 * 画布动画的抽象基类。
 * 实现公共动画生命周期和工具方法。
 */
export abstract class BaseAnimation implements IAnimation {
  readonly id: string;
  isActive: boolean = true;
  protected elapsedTime: number = 0;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * 更新动画状态。子类应调用 super.update()。
   * @param deltaTime - 距上一帧的时间 (ms)
   */
  update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
  }

  /**
   * 渲染动画。必须由子类实现。
   */
  abstract render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void;

  /**
   * 将动画标记为完成并准备移除。
   */
  complete(): void {
    this.isActive = false;
  }

  /**
   * 工具方法：线性插值。
   */
  protected lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * 工具方法：在最小值和最大值之间限制值。
   */
  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 工具方法：缓入缓出函数。
   */
  protected easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * 工具方法：正弦波振荡。
   */
  protected oscillate(frequency: number, amplitude: number = 1, offset: number = 0): number {
    return Math.sin(this.elapsedTime * frequency + offset) * amplitude;
  }

  destroy?(): void {
    // 如需清理，在子类中重写
  }
}
