/**
 * @fileoverview 用户偏好设置模块
 *
 * 提供用户偏好设置的读写功能，偏好数据持久化到 preference.json.chess 文件中。
 * 默认配置：
 *   - 背景音乐（主界面音乐）：播放 = true
 *   - 背景音乐音量：100
 *
 * 使用方法：
 *   import { preferenceManager } from '@chess/preference';
 *   const prefs = preferenceManager.getPreference();
 *   preferenceManager.updatePreference({ bgmEnabled: false, bgmVolume: 50 });
 *
 * @module @chess/preference
 */

import fs from 'fs';
import path from 'path';
import { createChessConfig } from '@chess/config';

const chessConfig = createChessConfig();
/**
 * 用户偏好设置接口
 * @interface UserPreference
 */
export interface UserPreference {
  /** 背景音乐（主界面音乐）是否播放 */
  bgmEnabled: boolean;
  /** 背景音乐音量大小 (0-100) */
  bgmVolume: number;
}

/**
 * 默认用户偏好设置
 */
export const defaultPreference: UserPreference = {
  bgmEnabled: true,
  bgmVolume: 100,
};

/**
 * 偏好文件路径
 */
function getPreferenceFilePath(): string {
  return path.join(chessConfig.log.monorepoRoot, 'preference.json.chess');
}

/**
 * 确保偏好文件存在，如果不存在则创建默认配置
 */
function ensurePreferenceFile(): void {
  const filePath = getPreferenceFilePath();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultPreference, null, 2), 'utf-8');
  }
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
    const parsed = JSON.parse(content) as Partial<UserPreference>;
    return {
      bgmEnabled: parsed.bgmEnabled ?? defaultPreference.bgmEnabled,
      bgmVolume: parsed.bgmVolume ?? defaultPreference.bgmVolume,
    };
  } catch (error) {
    console.error('Failed to read preference file, using defaults:', error);
    return { ...defaultPreference };
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
    return { ...this.cache };
  }

  /**
   * 更新用户偏好设置
   * @param updates - 要更新的偏好字段
   * @returns 更新后的完整偏好设置
   */
  updatePreference(updates: Partial<UserPreference>): UserPreference {
    const current = this.getPreference();
    const updated: UserPreference = {
      ...current,
      ...updates,
    };
    
    // 验证音量范围
    if (updated.bgmVolume < 0) updated.bgmVolume = 0;
    if (updated.bgmVolume > 100) updated.bgmVolume = 100;
    
    writePreference(updated);
    this.cache = updated;
    return { ...updated };
  }

  /**
   * 重置为默认偏好设置
   * @returns 默认偏好设置
   */
  resetToDefault(): UserPreference {
    writePreference(defaultPreference);
    this.cache = { ...defaultPreference };
    return { ...defaultPreference };
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
