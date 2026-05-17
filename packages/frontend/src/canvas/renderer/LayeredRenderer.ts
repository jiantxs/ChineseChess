/**
 * @file LayeredRenderer - 中央画布渲染协调器
 * 使用单个渲染循环管理多个分层和动画引擎。
 */

import { BaseLayer } from '../layers/BaseLayer';
import { AnimationEngine } from '../animations/AnimationEngine';
import { RenderLoop } from '../renderer/RenderLoop';
import { BoardMetrics } from '../types/canvas';

/**
 * 协调带动画支持的多层画布渲染。
 * 管理渲染循环、分层和动画引擎。
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

    // 设置画布尺寸
    this.canvas.width = metrics.width;
    this.canvas.height = metrics.height;
  }

  /**
   * 添加渲染分层。分层自动按 z-index 排序。
   * @param layer - 要添加的分层
   */
  addLayer(layer: BaseLayer): void {
    this.layers.push(layer);
    // 按 z-index 排序（升序 - 较低 z-index 先绘制）
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
    layer.onAttach?.();
  }

  /**
   * 移除分层。
   * @param layer - 要移除的分层
   */
  removeLayer(layer: BaseLayer): void {
    const index = this.layers.indexOf(layer);
    if (index >= 0) {
      this.layers.splice(index, 1);
      layer.onDetach?.();
    }
  }

  /**
   * 获取动画引擎以添加/移除动画。
   */
  get animationEngine(): AnimationEngine {
    return this.animEngine;
  }

  /**
   * 更新棋盘度量（例如在调整大小时）。
   * @param metrics - 新的棋盘度量
   */
  setMetrics(metrics: BoardMetrics): void {
    this.metrics = metrics;
    this.canvas.width = metrics.width;
    this.canvas.height = metrics.height;
  }

  /**
   * 启动渲染循环。
   */
  start(): void {
    if (this.unsubscribeFrame) return;

    this.unsubscribeFrame = this.renderLoop.onFrame((deltaTime, elapsedTime) => {
      this.render(deltaTime, elapsedTime);
    });
    this.renderLoop.start();
  }

  /**
   * 停止渲染循环。
   */
  stop(): void {
    this.renderLoop.stop();
    if (this.unsubscribeFrame) {
      this.unsubscribeFrame();
      this.unsubscribeFrame = null;
    }
  }

  /**
   * 执行单个渲染帧。
   * 由渲染循环自动调用。
   */
  private render(deltaTime: number, elapsedTime: number): void {
    // 清除画布
    this.ctx.clearRect(0, 0, this.metrics.width, this.metrics.height);

    // 更新动画
    this.animEngine.update(deltaTime);

    // 按顺序渲染分层
    for (const layer of this.layers) {
      layer.render(this.ctx, this.metrics, elapsedTime, deltaTime);
    }
  }

  /**
   * 检查渲染器是否正在运行。
   */
  get isRunning(): boolean {
    return this.renderLoop.running;
  }

  /**
   * 清理资源。
   */
  destroy(): void {
    this.stop();
    this.animEngine.clear();
    this.layers.forEach(layer => layer.onDetach?.());
    this.layers = [];
  }
}
