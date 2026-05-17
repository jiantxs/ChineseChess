/**
 * @file Cyber 风格实现
 * 赛博朋克风格的棋盘渲染内容，包含发光粒子、动态网格和霓虹色彩。
 */

import { BoardStyle } from '../types';
import { AnimationEngine } from '../../animations/AnimationEngine';
import { CyberBoardLayer } from './layers/CyberBoardLayer';
import { CyberBelowEffectsLayer } from './layers/CyberBelowEffectsLayer';
import { CyberPiecesLayer } from './layers/CyberPiecesLayer';
import { CyberAboveEffectsLayer } from './layers/CyberAboveEffectsLayer';
import { CyberGridLinesEffect } from './effects/CyberGridLinesEffect';
import { CyberStarfieldEffect } from './effects/CyberStarfieldEffect';
import { CyberCaptureEffect } from './effects/CyberCaptureEffect';
import { CyberMoveTrail } from './effects/CyberMoveTrail';
import { Side } from '@chess/types';

/**
 * Cyber 风格实例。
 * 提供赛博朋克视觉风格的完整棋盘渲染实现。
 */
export const cyberStyle: BoardStyle = {
  name: 'cyber',

  createLayers(animEngine) {
    const piecesLayer = new CyberPiecesLayer();
    const aboveEffectsLayer = new CyberAboveEffectsLayer();

    return {
      boardLayer: new CyberBoardLayer(),
      belowEffectsLayer: new CyberBelowEffectsLayer(animEngine),
      piecesLayer,
      aboveEffectsLayer,
    };
  },

  createBackgroundAnimations() {
    return [
      new CyberGridLinesEffect(),
      new CyberStarfieldEffect(),
    ];
  },

  createCaptureEffect(x: number, y: number, side: Side, uniqueId: string) {
    return new CyberCaptureEffect(x, y, side, uniqueId);
  },

  createMoveTrail(fromX: number, fromY: number, toX: number, toY: number, side: Side, uniqueId: string) {
    return new CyberMoveTrail(fromX, fromY, toX, toY, side, uniqueId);
  },
};
