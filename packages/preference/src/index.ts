/**
 * @fileoverview 用户偏好设置模块
 *
 * 提供用户偏好设置的读写功能，偏好数据持久化到 preference.json.chess 文件中。
 * 默认配置：
 *   - 背景音乐（主界面音乐）：播放 = true, 可见 = true
 *   - 背景音乐音量：100, 可见 = true
 *
 * 使用方法：
 *   import { preferenceManager } from '@chess/preference';
 *   const prefs = preferenceManager.getPreference();
 *   preferenceManager.updatePreference({ audio: { bgm: { enabled: { value: false }, volume: { value: 50 } } } });
 *
 * @module @chess/preference
 */

import fs from 'fs';
import path from 'path';
import type { ChessConfig } from '@chess/config';
import type { UserPreference } from '@chess/types';
import { defaultUserPreference } from '@chess/types';

// 重新导出共享类型，便于其他包使用
export type { UserPreference, PreferenceOption } from '@chess/types';

// 重新导出默认偏好设置（别名，便于其他包使用）
export { defaultUserPreference as defaultPreference, defaultUserPreference } from '@chess/types';

/**
 * 配置单例 holder
 */
let configHolder: { config: ChessConfig } | null = null;

/**
 * 初始化偏好管理器
 * @param config - ChessConfig 实例
 */
export function initPreferenceManager(config: ChessConfig): void {
  configHolder = { config };
}

/**
 * 偏好文件路径
 */
function getPreferenceFilePath(): string {
  if (!configHolder) {
    throw new Error('Preference manager not initialized. Call initPreferenceManager first.');
  }
  return path.join(configHolder.config.log.monorepoRoot, 'preference.json.chess');
}

/**
 * 确保偏好文件存在，如果不存在则创建默认配置
 */
function ensurePreferenceFile(): void {
  const filePath = getPreferenceFilePath();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultUserPreference, null, 2), 'utf-8');
  }
}

/**
 * 通用深度合并（只合并不为 undefined 的字段）
 */
function deepMerge(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const baseValue = base[key];
    if (baseValue && typeof baseValue === 'object' && typeof value === 'object' && !Array.isArray(baseValue) && !Array.isArray(value)) {
      result[key] = deepMerge(baseValue as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 深度合并分层偏好设置（支持部分更新）
 */
function mergePreference(
  current: UserPreference,
  updates: Partial<UserPreference>
): UserPreference {
  return deepMerge(current as unknown as Record<string, unknown>, updates as unknown as Record<string, unknown>) as unknown as UserPreference;
}

/**
 * 读取用户偏好设置
 * @returns 用户偏好设置对象
 */
function readPreference(): UserPreference {
  ensurePreferenceFile();
  const filePath = getPreferenceFilePath();
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as UserPreference;
    return deepMerge(defaultUserPreference as unknown as Record<string, unknown>, parsed as unknown as Record<string, unknown>) as unknown as UserPreference;
  } catch (error) {
    console.error('Failed to read preference file, using defaults:', error);
    return JSON.parse(JSON.stringify(defaultUserPreference));
  }
}

/**
 * 写入用户偏好设置
 * @param preference - 要保存的用户偏好设置
 */
function writePreference(preference: UserPreference): void {
  const filePath = getPreferenceFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(preference, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write preference file:', error);
    throw error;
  }
}

/**
 * 用户偏好管理器
 * 提供获取和更新用户偏好的方法
 */
export class PreferenceManager {
  /**
   * 获取当前用户偏好设置
   * @returns 用户偏好设置对象
   */
  getPreference(): UserPreference {
    return readPreference();
  }

  /**
   * 更新用户偏好设置
   * @param updates - 要更新的偏好字段
   * @returns 更新后的完整偏好设置
   */
  updatePreference(updates: Partial<UserPreference>): UserPreference {
    const current = this.getPreference();
    const updated = mergePreference(current, updates as Record<string, unknown>) as UserPreference;
    this.validateAndSave(updated);
    return JSON.parse(JSON.stringify(updated)) as UserPreference;
  }

  /**
   * 验证并保存偏好设置
   */
  private validateAndSave(preference: UserPreference): void {
    // 验证音量范围
    if (preference.audio.bgm.volume.value < 0) {
      preference.audio.bgm.volume.value = 0;
    }
    if (preference.audio.bgm.volume.value > 100) {
      preference.audio.bgm.volume.value = 100;
    }

    writePreference(preference);
  }

  /**
   * 重置为默认偏好设置
   * @returns 默认偏好设置
   */
  resetToDefault(): UserPreference {
    const defaultCopy = JSON.parse(JSON.stringify(defaultUserPreference)) as UserPreference;
    writePreference(defaultCopy);
    return defaultCopy;
  }
}

/**
 * 全局偏好管理器实例
 */
export const preferenceManager = new PreferenceManager();

/**
 * 获取当前用户偏好设置的便捷函数
 * @returns 用户偏好设置对象
 */
export function getPreference(): UserPreference {
  return preferenceManager.getPreference();
}

/**
 * 更新用户偏好设置的便捷函数
 * @param updates - 要更新的偏好字段
 * @returns 更新后的完整偏好设置
 */
export function updatePreference(updates: Partial<UserPreference>): UserPreference {
  return preferenceManager.updatePreference(updates);
}

/**
 * 重置为默认偏好设置的便捷函数
 * @returns 默认偏好设置
 */
export function resetPreference(): UserPreference {
  return preferenceManager.resetToDefault();
}