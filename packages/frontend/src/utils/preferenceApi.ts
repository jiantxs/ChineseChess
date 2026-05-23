/**
 * @file 用户偏好设置 API 工具函数
 *
 * 提供与后端 /api/preference 接口通信的函数。
 * 使用 apiPath 确保正确处理路径前缀。
 *
 * 用法：
 *   import { getPreference, updatePreference, resetPreference } from './preferenceApi';
 *   const prefs = await getPreference();
 *   await updatePreference({ bgmEnabled: false, bgmVolume: 50 });
 *
 * @module utils/preferenceApi
 */

import { apiPath } from './api';

/**
 * 用户偏好设置接口
 */
export interface UserPreference {
  /** 背景音乐（主界面音乐）是否播放 */
  bgmEnabled: boolean;
  /** 背景音乐音量大小 (0-100) */
  bgmVolume: number;
}

/**
 * API 响应接口
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 获取当前用户偏好设置
 * @returns 用户偏好设置对象
 * @throws 获取失败时抛出错误
 */
export async function getPreference(): Promise<UserPreference> {
  const response = await fetch(apiPath('/api/preference'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`获取偏好设置失败: HTTP ${response.status}`);
  }

  const result: ApiResponse<UserPreference> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || '获取偏好设置失败');
  }

  return result.data;
}

/**
 * 更新用户偏好设置（支持部分更新）
 * @param updates - 要更新的偏好字段
 * @returns 更新后的完整偏好设置
 * @throws 更新失败时抛出错误
 */
export async function updatePreference(
  updates: Partial<UserPreference>
): Promise<UserPreference> {
  const response = await fetch(apiPath('/api/preference'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`更新偏好设置失败: HTTP ${response.status}`);
  }

  const result: ApiResponse<UserPreference> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || '更新偏好设置失败');
  }

  return result.data;
}

/**
 * 重置用户偏好设置为默认值
 * @returns 默认偏好设置
 * @throws 重置失败时抛出错误
 */
export async function resetPreference(): Promise<UserPreference> {
  const response = await fetch(apiPath('/api/preference/reset'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`重置偏好设置失败: HTTP ${response.status}`);
  }

  const result: ApiResponse<UserPreference> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || '重置偏好设置失败');
  }

  return result.data;
}
