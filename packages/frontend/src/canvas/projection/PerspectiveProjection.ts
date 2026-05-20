/**
 * @file PerspectiveProjection - 3D 透视投影核心
 * 将棋盘 2D 逻辑坐标通过 3D 透视变换映射到屏幕坐标，并自动 fit 到 viewport。
 */

import { BoardMetrics } from '../types/canvas';
import { clientLogger } from '../../utils/clientLogger';

/**
 * 3D 透视投影器。
 * 相机位于棋盘上方并偏向玩家侧（底部），产生近大远小的透视效果。
 * 投影结果会自动缩放并居中，确保棋盘完整显示在 canvas 内。
 */
export class PerspectiveProjection {
  private focalLength: number;
  private camX: number = 0;
  private camY: number = 0;
  private camZ: number = 0;
  private fx: number = 0;
  private fy: number = 0;
  private fz: number = 0;
  private rx: number = 0;
  private ry: number = 0;
  private rz: number = 0;
  private ux: number = 0;
  private uy: number = 0;
  private uz: number = 0;

  // 自动 fit 参数
  private displayScale: number = 1;
  private displayOffsetX: number = 0;
  private displayOffsetY: number = 0;

  constructor(vpW: number, vpH: number) {
    this.focalLength = vpH * 0.9;
    // 相机：上方 0.9*vpH，偏向底部（z 正方向）0.5*vpH，看向棋盘中心偏上
    this.setCamera([0, vpH * 0.9, vpH * 0.5], [0, 0, -vpH * 0.15]);
  }

  /**
   * 设置相机参数。
   * @param pos - 相机位置 [x, y, z]
   * @param lookAt - 看向点 [x, y, z]
   */
  setCamera(pos: [number, number, number], lookAt: [number, number, number]) {
    this.camX = pos[0];
    this.camY = pos[1];
    this.camZ = pos[2];

    let dx = lookAt[0] - pos[0];
    let dy = lookAt[1] - pos[1];
    let dz = lookAt[2] - pos[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.fx = dx / len;
    this.fy = dy / len;
    this.fz = dz / len;

    const rlen = Math.sqrt(this.fz * this.fz + this.fx * this.fx);
    this.rx = -this.fz / rlen;
    this.ry = 0;
    this.rz = this.fx / rlen;

    this.ux = this.ry * this.fz - this.rz * this.fy;
    this.uy = this.rz * this.fx - this.rx * this.fz;
    this.uz = this.rx * this.fy - this.ry * this.fx;
  }

  /**
   * 根据实际棋盘 metrics 计算所有角点的原始投影，
   * 然后调整 displayScale/Offset 使结果 fit 在 canvas 内（留 8% 边距）。
   */
  calibrate(metrics: BoardMetrics): void {
    const { width, height, cols, rows } = metrics;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const p = this.rawProject(metrics, c, r);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }

    const margin = 0.08;
    const availW = width * (1 - margin * 2);
    const availH = height * (1 - margin * 2);

    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;

    this.displayScale = Math.min(availW / contentW, availH / contentH, 1.5);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.displayOffsetX = width / 2 - centerX * this.displayScale;
    this.displayOffsetY = height / 2 - centerY * this.displayScale;

    clientLogger.debug('PerspectiveProjection calibrated', {
      displayScale: this.displayScale,
      displayOffsetX: this.displayOffsetX,
      displayOffsetY: this.displayOffsetY,
      contentW,
      contentH,
    });
  }

  /**
   * 将棋盘格子坐标投影到屏幕坐标（含自动 fit）。
   * @returns 屏幕坐标 x, y 以及缩放因子 scale（近大远小）
   */
  project(
    metrics: BoardMetrics,
    col: number,
    row: number
  ): { x: number; y: number; scale: number } {
    const raw = this.rawProject(metrics, col, row);
    return {
      x: raw.x * this.displayScale + this.displayOffsetX,
      y: raw.y * this.displayScale + this.displayOffsetY,
      scale: raw.scale * this.displayScale,
    };
  }

  /**
   * 将屏幕坐标反投影回棋盘格子坐标。
   * @returns 连续的 col/row（非整数），或 null 如果射线不命中棋盘平面
   */
  unproject(
    metrics: BoardMetrics,
    screenX: number,
    screenY: number
  ): { col: number; row: number } | null {
    const { width, height, cellSize, cols, rows } = metrics;

    // 先逆变换 fit
    const rawX = (screenX - this.displayOffsetX) / this.displayScale;
    const rawY = (screenY - this.displayOffsetY) / this.displayScale;

    const ndcX = (rawX - width / 2) / this.focalLength;
    const ndcY = -(rawY - height / 2) / this.focalLength;

    const dirX = this.rx * ndcX + this.ux * ndcY + this.fx;
    const dirY = this.ry * ndcX + this.uy * ndcY + this.fy;
    const dirZ = this.rz * ndcX + this.uz * ndcY + this.fz;

    if (Math.abs(dirY) < 1e-6) {
      clientLogger.warn('Unproject failed: ray parallel to board plane', { screenX, screenY });
      return null;
    }

    const t = -this.camY / dirY;
    if (t < 0.1) {
      clientLogger.warn('Unproject failed: ray does not hit board plane', { screenX, screenY, t });
      return null;
    }

    const worldX = this.camX + t * dirX;
    const worldZ = this.camZ + t * dirZ;

    const col = worldX / cellSize + (cols - 1) / 2;
    const row = worldZ / cellSize + (rows - 1) / 2;

    return { col, row };
  }

  /**
   * 原始投影（不含 fit 缩放/平移）。
   */
  private rawProject(
    metrics: BoardMetrics,
    col: number,
    row: number
  ): { x: number; y: number; scale: number } {
    const { cols, rows, cellSize, width, height } = metrics;
    const worldX = (col - (cols - 1) / 2) * cellSize;
    const worldZ = (row - (rows - 1) / 2) * cellSize;
    const worldY = 0;

    const dx = worldX - this.camX;
    const dy = worldY - this.camY;
    const dz = worldZ - this.camZ;

    const viewZ = dx * this.fx + dy * this.fy + dz * this.fz;
    const viewX = dx * this.rx + dy * this.ry + dz * this.rz;
    const viewY = dx * this.ux + dy * this.uy + dz * this.uz;

    const scale = this.focalLength / viewZ;
    const x = width / 2 + viewX * scale;
    const y = height / 2 - viewY * scale;

    return { x, y, scale };
  }
}
