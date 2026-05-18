/**
 * @file Cyber3D 风格实现
 * 在 Cyber 风格基础上增加 3D 透视投影，呈现近大远小的伪 3D 棋盘效果。
 */

import { BoardStyle } from '../types';
import { AnimationEngine } from '../../animations/AnimationEngine';
import { Cyber3DBoardLayer } from './layers/Cyber3DBoardLayer';
import { Cyber3DBelowEffectsLayer } from './layers/Cyber3DBelowEffectsLayer';
import { Cyber3DPiecesLayer } from './layers/Cyber3DPiecesLayer';
import { Cyber3DAboveEffectsLayer } from './layers/Cyber3DAboveEffectsLayer';
import { Cyber3DGridLinesEffect } from './effects/Cyber3DGridLinesEffect';
import { CyberStarfieldEffect } from '../cyber/effects/CyberStarfieldEffect';
import { CyberCaptureEffect } from '../cyber/effects/CyberCaptureEffect';
import { CyberMoveTrail } from '../cyber/effects/CyberMoveTrail';
import { Side } from '@chess/types';
import { PerspectiveProjection } from '../../projection/PerspectiveProjection';

export const cyber3dStyle: BoardStyle = {
  name: 'cyber3d',

  createLayers(animEngine) {
    const piecesLayer = new Cyber3DPiecesLayer();
    const aboveEffectsLayer = new Cyber3DAboveEffectsLayer();

    return {
      boardLayer: new Cyber3DBoardLayer(),
      belowEffectsLayer: new Cyber3DBelowEffectsLayer(animEngine),
      piecesLayer,
      aboveEffectsLayer,
    };
  },

  createBackgroundAnimations() {
    return [
      new Cyber3DGridLinesEffect(),
      new CyberStarfieldEffect(),
    ];
  },

  createCaptureEffect(x: number, y: number, side: Side, uniqueId: string) {
    return new CyberCaptureEffect(x, y, side, uniqueId);
  },

  createMoveTrail(fromX: number, fromY: number, toX: number, toY: number, side: Side, uniqueId: string) {
    return new CyberMoveTrail(fromX, fromY, toX, toY, side, uniqueId);
  },

  createProjection(metrics) {
    return new PerspectiveProjection(metrics.width, metrics.height);
  },
};
