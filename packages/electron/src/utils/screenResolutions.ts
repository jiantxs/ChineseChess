/**
 * Electron 屏幕分辨率检测与计算工具
 */

import { screen } from 'electron';

export interface ResolutionOption {
  label: string;
  value: string;
  width: number;
  height: number;
  scale: number;
  isFullscreen: boolean;
}

/**
 * 检测主显示器分辨率并计算可用选项
 */
export function calculateResolutionOptions(): ResolutionOption[] {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // 计算 16:9 比例下的最大可用分辨率
  let maxWidth: number;
  let maxHeight: number;

  const baseHeight = Math.round(screenWidth * 9 / 16);
  if (baseHeight <= screenHeight) {
    maxWidth = screenWidth;
    maxHeight = baseHeight;
  } else {
    maxHeight = screenHeight;
    maxWidth = Math.round(screenHeight * 16 / 9);
  }

  // 缩放比例: 100%, 75%, 50%, 25%
  const scales = [1, 0.75, 0.5, 0.25];
  const options: ResolutionOption[] = [];

  for (const scale of scales) {
    const w = Math.round(maxWidth * scale);
    const h = Math.round(maxHeight * scale);

    // 确保不小于最小分辨率 1280x720
    if (w < 1280 || h < 720) continue;

    // 取整到常见的标准分辨率
    const standardRes = snapToStandardResolution(w, h);

    options.push({
      label: `${standardRes.width} × ${standardRes.height} (${Math.round(scale * 100)}%)`,
      value: `${standardRes.width}x${standardRes.height}`,
      width: standardRes.width,
      height: standardRes.height,
      scale,
      isFullscreen: false
    });
  }

  // 添加全屏选项
  options.unshift({
    label: '全屏',
    value: 'fullscreen',
    width: screenWidth,
    height: screenHeight,
    scale: 1,
    isFullscreen: true
  });

  // 确保至少有一个普通窗口选项
  if (options.length <= 1) {
    options.push({
      label: '1280 × 720 (窗口模式)',
      value: '1280x720',
      width: 1280,
      height: 720,
      scale: 0.25,
      isFullscreen: false
    });
  }

  return options;
}

/**
 * 将计算出的分辨率对齐到标准分辨率
 */
function snapToStandardResolution(w: number, h: number): { width: number; height: number } {
  const standards = [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
  ];

  for (const std of standards) {
    if (Math.abs(w - std.width) <= 50 && Math.abs(h - std.height) <= 50) {
      return std;
    }
  }

  return {
    width: Math.round(w / 2) * 2,
    height: Math.round(h / 2) * 2
  };
}
