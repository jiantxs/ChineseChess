/**
 * @file 动画引擎 - 管理所有活动动画
 * 提供集中的动画生命周期管理。
 */

import { IAnimation, BoardMetrics } from '../types/canvas';
import { clientLogger } from '../../utils/clientLogger';

/**
 * 所有画布动画的中央管理器。
 * 处理动画的注册、更新和渲染。
 */
export class AnimationEngine {
  private animations: Map<string, IAnimation> = new Map();

  /**
   * 向引擎添加动画。
   * @param animation - 要管理的动画实例
   */
  add(animation: IAnimation): void {
    this.animations.set(animation.id, animation);
    clientLogger.debug('Animation added', { animationId: animation.id, activeCount: this.animations.size });
  }

  /**
   * 通过 ID 移除动画。
   * @param id - 动画标识符
   */
  remove(id: string): void {
    const anim = this.animations.get(id);
    if (anim?.destroy) {
      anim.destroy();
    }
    this.animations.delete(id);
  }

  /**
   * 移除所有动画。
   */
  clear(): void {
    const count = this.animations.size;
    this.animations.forEach(anim => {
      if (anim.destroy) anim.destroy();
    });
    this.animations.clear();
    clientLogger.debug('AnimationEngine cleared', { clearedCount: count });
  }

  /**
   * 更新所有活动动画。
   * @param deltaTime - 距上一帧的时间 (ms)
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
   * 渲染所有活动动画。
   * @param ctx - 画布 2D 上下文
   * @param metrics - 棋盘布局度量
   */
  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void {
    for (const anim of this.animations.values()) {
      if (anim.isActive) {
        anim.render(ctx, metrics);
      }
    }
  }

  /**
   * 获取活动动画的数量。
   */
  get activeCount(): number {
    return this.animations.size;
  }
}
