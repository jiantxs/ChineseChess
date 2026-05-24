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
export { defaultUserPreference as defaultPreference } from '@chess/types';

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
 * 深度合并分层偏好设置（支持部分更新）
 */
function deepMergePreference(
  current: UserPreference,
  updates: Partial<UserPreference>
): UserPreference {
  return {
    audio: {
      bgm: {
        enabled: updates.audio?.bgm?.enabled
          ? { ...current.audio.bgm.enabled, ...updates.audio.bgm.enabled }
          : { ...current.audio.bgm.enabled },
        volume: updates.audio?.bgm?.volume
          ? { ...current.audio.bgm.volume, ...updates.audio.bgm.volume }
          : { ...current.audio.bgm.volume },
      },
    },
    ai: {
      difficulty: updates.ai?.difficulty
        ? { ...current.ai.difficulty, ...updates.ai.difficulty }
        : { ...current.ai.difficulty },
    },
  };
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
    const parsed = JSON.parse(content);

    // 新版分层结构，带默认值填充
    const result: UserPreference = {
      audio: {
        bgm: {
          enabled: {
            value: parsed.audio?.bgm?.enabled?.value ?? defaultUserPreference.audio.bgm.enabled.value,
            visible: parsed.audio?.bgm?.enabled?.visible ?? defaultUserPreference.audio.bgm.enabled.visible,
          },
          volume: {
            value: parsed.audio?.bgm?.volume?.value ?? defaultUserPreference.audio.bgm.volume.value,
            visible: parsed.audio?.bgm?.volume?.visible ?? defaultUserPreference.audio.bgm.volume.visible,
          },
        },
      },
      ai: {
        difficulty: {
          value: parsed.ai?.difficulty?.value ?? defaultUserPreference.ai.difficulty.value,
          visible: parsed.ai?.difficulty?.visible ?? defaultUserPreference.ai.difficulty.visible,
        },
      },
    };
    return result;
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
  private cache: UserPreference | null = null;

  /**
   * 获取当前用户偏好设置
   * @returns 用户偏好设置对象
   */
  getPreference(): UserPreference {
    if (!this.cache) {
      this.cache = readPreference();
    }
    return JSON.parse(JSON.stringify(this.cache)) as UserPreference;
  }

  /**
   * 更新用户偏好设置
   * @param updates - 要更新的偏好字段
   * @returns 更新后的完整偏好设置
   */
  updatePreference(updates: Partial<UserPreference>): UserPreference {
    const current = this.getPreference();
    const updated = deepMergePreference(current, updates);
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
    this.cache = preference;
  }

  /**
   * 重置为默认偏好设置
   * @returns 默认偏好设置
   */
  resetToDefault(): UserPreference {
    const defaultCopy = JSON.parse(JSON.stringify(defaultUserPreference)) as UserPreference;
    writePreference(defaultCopy);
    this.cache = defaultCopy;
    return defaultCopy;
  }

  /**
   * 清除缓存，下次获取时重新读取文件
   */
  clearCache(): void {
    this.cache = null;
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