/**
 * @file BoardRenderingKit - 棋盘渲染组装套件
 * 将独立渲染器与具体风格内容组装在一起，为 ChessBoard 提供统一的交互接口。
 */

import { LayeredRenderer } from './renderer/LayeredRenderer';
import { AnimationEngine } from './animations/AnimationEngine';
import { BoardMetrics } from './types/canvas';
import { GameState, Position, Side } from '@chess/types';
import { getStyle } from './styles';
import { PiecesLayerInterface, AboveEffectsLayerInterface } from './styles/types';

/**
 * 组装并管理棋盘渲染所需的所有组件。
 * 将通用渲染器（LayeredRenderer）与风格特定的内容解耦。
 */
export class BoardRenderingKit {
  private renderer: LayeredRenderer;
  private animEngine: AnimationEngine;
  private piecesLayer: PiecesLayerInterface;
  private aboveEffectsLayer: AboveEffectsLayerInterface;
  private unsubscribeAnimUpdate: (() => void) | null = null;
  private styleName: string;
  private currentMetrics: BoardMetrics;

  constructor(canvas: HTMLCanvasElement, metrics: BoardMetrics, styleName: string = 'cyber') {
    this.styleName = styleName;
    const style = getStyle(styleName);

    // 若风格提供投影，注入到 metrics
    let projection = style.createProjection?.(metrics);
    if (projection) {
      projection.calibrate(metrics);
    }
    const finalMetrics = projection ? { ...metrics, projection } : metrics;
    this.currentMetrics = finalMetrics;

    // 创建通用动画引擎
    this.animEngine = new AnimationEngine();

    // 创建独立渲染器（不包含任何风格逻辑）
    this.renderer = new LayeredRenderer(canvas, finalMetrics);

    // 创建风格特定的分层（传入共享的动画引擎）
    const layers = style.createLayers(this.animEngine);

    this.piecesLayer = layers.piecesLayer;
    this.aboveEffectsLayer = layers.aboveEffectsLayer;

    // 按 z-index 顺序添加分层
    this.renderer.addLayer(layers.boardLayer);
    this.renderer.addLayer(layers.belowEffectsLayer);
    this.renderer.addLayer(this.piecesLayer);
    this.renderer.addLayer(this.aboveEffectsLayer);

    // 注册动画更新到渲染循环（在渲染分层之前执行）
    this.unsubscribeAnimUpdate = this.renderer.onBeforeRender((deltaTime) => {
      this.animEngine.update(deltaTime);
    });

    // 注册背景动画
    const bgAnimations = style.createBackgroundAnimations();
    for (const anim of bgAnimations) {
      this.animEngine.add(anim);
    }
  }

  /**
   * 启动渲染循环。
   */
  start(): void {
    this.renderer.start();
  }

  /**
   * 停止渲染循环。
   */
  stop(): void {
    this.renderer.stop();
  }

  /**
   * 更新棋盘尺寸。
   */
  setMetrics(metrics: BoardMetrics): void {
    const style = getStyle(this.styleName);
    let projection = style.createProjection?.(metrics);
    if (projection) {
      projection.calibrate(metrics);
    }
    const finalMetrics = projection ? { ...metrics, projection } : metrics;
    this.currentMetrics = finalMetrics;
    this.renderer.setMetrics(finalMetrics);
  }

  /**
   * 获取当前带投影的 metrics。
   */
  getMetrics(): BoardMetrics {
    return this.currentMetrics;
  }

  /**
   * 更新游戏状态（传递给棋子层）。
   */
  setGameState(state: GameState | null): void {
    this.piecesLayer.setGameState(state);
  }

  /**
   * 更新选中位置（传递给上层特效层）。
   */
  setSelectedPosition(pos: Position | null): void {
    this.aboveEffectsLayer.setSelectedPosition(pos);
  }

  /**
   * 更新可移动位置（传递给上层特效层）。
   */
  setValidMoves(moves: Position[]): void {
    this.aboveEffectsLayer.setValidMoves(moves);
  }

  /**
   * 更新游戏结束状态（传递给上层特效层）。
   */
  setGameOverState(state: GameState | null): void {
    this.aboveEffectsLayer.setGameState(state);
  }

  /**
   * 添加吃子特效。
   */
  addCaptureEffect(x: number, y: number, side: Side, uniqueId: string): void {
    const style = getStyle(this.styleName);
    this.animEngine.add(style.createCaptureEffect(x, y, side, uniqueId));
  }

  /**
   * 添加移动轨迹特效。
   */
  addMoveTrail(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    side: Side,
    uniqueId: string
  ): void {
    const style = getStyle(this.styleName);
    this.animEngine.add(style.createMoveTrail(fromX, fromY, toX, toY, side, uniqueId));
  }

  /**
   * 清理所有资源。
   */
  destroy(): void {
    if (this.unsubscribeAnimUpdate) {
      this.unsubscribeAnimUpdate();
      this.unsubscribeAnimUpdate = null;
    }
    this.animEngine.clear();
    this.renderer.destroy();
  }
}
