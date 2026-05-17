/**
 * @file 画布动画系统共享类型
 */

/** 画布上的 2D 位置 */
export interface Point {
  x: number;
  y: number;
}

/** 动画分层类型 - 决定相对于棋子的渲染顺序 */
export type LayerType = 'below' | 'above';

/** 传递给分层的棋盘尺寸和布局信息 */
export interface BoardMetrics {
  width: number;
  height: number;
  cellSize: number;
  padding: number;
  pieceSize: number;
  cols: number;
  rows: number;
}

/** 每帧传递的动画状态快照 */
export interface FrameContext {
  /** 画布 2D 渲染上下文 */
  ctx: CanvasRenderingContext2D;
  /** 自动画开始以来的已用时间 (ms) */
  elapsedTime: number;
  /** 距上一帧的增量时间 (ms) */
  deltaTime: number;
  /** 棋盘布局度量 */
  metrics: BoardMetrics;
  /** 当前游戏状态（可选，用于上下文感知动画） */
  // gameState 将在需要时添加
}

/** 基本动画接口 */
export interface IAnimation {
  /** 唯一标识符 */
  id: string;
  /** 动画是否仍处于活动状态 */
  isActive: boolean;
  /** 更新动画状态 */
  update(deltaTime: number): void;
  /** 将动画渲染到画布 */
  render(ctx: CanvasRenderingContext2D, metrics: BoardMetrics): void;
  /** 动画完成或被移除时调用 */
  destroy?(): void;
}

/** 分层渲染优先级（更高 = 更晚绘制/在顶部） */
export type ZIndex = 0 | 1 | 2 | 3;

/** 星空动画的星星对象 */
export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  glowType: 'none' | 'bar' | 'circle';
  glowColor: string;
}
