/**
 * @file CyberBoardLayer - 第0层：棋盘背景 (Cyber 风格)
 * 渲染静态棋盘背景。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { BoardMetrics } from '../../../types/canvas';
import { clientLogger } from '../../../../utils/clientLogger';

/** 缓存的棋盘 SVG 图片 */
let boardImage: HTMLImageElement | null = null;
let boardImageLoaded = false;

/**
 * 加载棋盘 SVG 图片。
 * @returns 图片加载完成时解析的 Promise
 */
function loadBoardImage(): Promise<void> {
  if (boardImageLoaded) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      boardImage = img;
      boardImageLoaded = true;
      resolve();
    };
    img.onerror = () => {
      clientLogger.error('Failed to load board image');
      resolve();
    };
    img.src = './assets/svg/cyber/board.svg';
  });
}

/**
 * 第0层：渲染棋盘背景。
 * 如果 SVG 图片可用则使用它，否则回退到纯色。
 */
export class CyberBoardLayer extends BaseLayer {
  readonly zIndex = 0;
  private imageReady: boolean = false;

  constructor() {
    super();
    loadBoardImage().then(() => {
      this.imageReady = true;
    });
  }

  render(
    ctx: CanvasRenderingContext2D,
    metrics: BoardMetrics,
    _elapsedTime: number,
    _deltaTime: number
  ): void {
    if (boardImage && this.imageReady) {
      ctx.drawImage(boardImage, 0, 0, metrics.width, metrics.height);
    } else {
      // 回退：黑色背景（根据用户的新棋盘设计）
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, metrics.width, metrics.height);
    }
  }
}
