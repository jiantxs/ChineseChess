/**
 * @file 棋盘风格注册表
 * 管理所有可用的渲染风格，提供风格查找和枚举能力。
 */

import { BoardStyle } from './types';
import { cyberStyle } from './cyber';
import { cyber3dStyle } from './cyber3d';
import { clientLogger } from '../../utils/clientLogger';

/**
 * 风格名称到风格实现的映射。
 */
const styleRegistry: Map<string, BoardStyle> = new Map();

/**
 * 注册一个棋盘风格。
 * @param style - 要实现的风格实例
 */
export function registerStyle(style: BoardStyle): void {
  styleRegistry.set(style.name, style);
  clientLogger.debug('Board style registered', { styleName: style.name });
}

/**
 * 根据名称获取棋盘风格。
 * @param name - 风格名称
 * @returns 对应的风格实现，若未找到则返回默认风格
 */
export function getStyle(name: string): BoardStyle {
  const style = styleRegistry.get(name);
  if (!style) {
    clientLogger.warn('Unknown board style, falling back to cyber', { requestedStyle: name });
    return styleRegistry.get('cyber')!;
  }
  return style;
}

/**
 * 获取所有已注册的风格名称。
 */
export function getRegisteredStyleNames(): string[] {
  return Array.from(styleRegistry.keys());
}

// 注册内置风格
registerStyle(cyberStyle);
registerStyle(cyber3dStyle);
