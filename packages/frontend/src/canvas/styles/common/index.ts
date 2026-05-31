/**
 * @file Common 风格实现
 * 拟物写实风格的棋盘渲染内容，使用木制棋子SVG和简洁效果。
 */

import { BoardStyle } from '../types';
import { AnimationEngine } from '../../animations/AnimationEngine';
import { CommonBoardLayer } from './layers/CommonBoardLayer';
import { CommonBelowEffectsLayer } from './layers/CommonBelowEffectsLayer';
import { CommonPiecesLayer } from './layers/CommonPiecesLayer';
import { CommonAboveEffectsLayer } from './layers/CommonAboveEffectsLayer';
import { CommonCaptureEffect } from './effects/CommonCaptureEffect';
import { CommonMoveTrail } from './effects/CommonMoveTrail';
import { Side } from '@chess/types';

/**
 * Common 风格实例。
 * 提供拟物写实视觉风格的完整棋盘渲染实现。
 */
export const commonStyle: BoardStyle = {
  name: 'common',

  createLayers(animEngine) {
    const piecesLayer = new CommonPiecesLayer();
    const aboveEffectsLayer = new CommonAboveEffectsLayer();

    return {
      boardLayer: new CommonBoardLayer(),
      belowEffectsLayer: new CommonBelowEffectsLayer(animEngine),
      piecesLayer,
      aboveEffectsLayer,
    };
  },

  createBackgroundAnimations() {
    // Common风格不需要背景动画
    return [];
  },

  createCaptureEffect(x: number, y: number, side: Side, uniqueId: string) {
    return new CommonCaptureEffect(x, y, side, uniqueId);
  },

  createMoveTrail(fromX: number, fromY: number, toX: number, toY: number, side: Side, uniqueId: string) {
    return new CommonMoveTrail(fromX, fromY, toX, toY, side, uniqueId);
  },
};
