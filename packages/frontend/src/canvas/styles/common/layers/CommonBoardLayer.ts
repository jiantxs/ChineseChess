/**
 * @file CommonBoardLayer - 第0层：棋盘背景 (Common 拟物风格)
 * 渲染静态棋盘背景，使用木制棋盘SVG。
 */

import { BaseLayer } from '../../../layers/BaseLayer';
import { BoardMetrics } from '../../../types/canvas';
import { clientLogger } from '../../../../utils/clientLogger';
import { assetPath } from '../../../../utils/api';

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
      clientLogger.debug('Common board image loaded successfully');
      resolve();
    };
    img.onerror = () => {
      clientLogger.error('Failed to load common board image');
      resolve();
    };
    img.src = assetPath('/assets/svg/common/board.svg');
  });
}

/**
 * 第0层：渲染棋盘背景。
 * 使用木制拟物风格SVG图片。
 */
export class CommonBoardLayer extends BaseLayer {
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
      // 回退：木质色背景
      ctx.fillStyle = '#e8d5b5';
      ctx.fillRect(0, 0, metrics.width, metrics.height);
    }
  }
}
