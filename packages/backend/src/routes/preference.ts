/**
 * @fileoverview 用户偏好设置路由
 * @module backend/src/routes/preference
 *
 * 提供 REST API 用于获取和更新用户偏好设置。
 * 所有偏好数据通过 @chess/preference 包持久化到 preference.json.chess 文件。
 *
 * 路由：
 *   GET  /api/preference       - 获取当前用户偏好
 *   POST /api/preference       - 更新用户偏好（接受部分更新）
 *   POST /api/preference/reset - 重置为默认偏好
 */

import { Router } from 'express';
import { preferenceManager, type UserPreference } from '@chess/preference';

/**
 * 创建用户偏好设置路由器
 * @returns 配置好的 Express Router 实例
 */
export function createPreferenceRouter(): Router {
  const router = Router();

  /**
   * GET /api/preference
   * 获取当前用户偏好设置
   */
  router.get('/preference', (req, res) => {
    try {
      const preference = preferenceManager.getPreference();
      res.json({
        success: true,
        data: preference,
      });
    } catch (error) {
      console.error('Failed to get preference:', error);
      res.status(500).json({
        success: false,
        error: '获取偏好设置失败',
      });
    }
  });

  /**
   * POST /api/preference
   * 更新用户偏好设置（支持部分更新）
   */
  router.post('/preference', (req, res) => {
    try {
      const updates: Partial<UserPreference> = req.body;
      
      // 验证更新数据
      if (updates.bgmEnabled !== undefined && typeof updates.bgmEnabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'bgmEnabled 必须是布尔值',
        });
        return;
      }
      
      if (updates.bgmVolume !== undefined) {
        const volume = Number(updates.bgmVolume);
        if (isNaN(volume) || volume < 0 || volume > 100) {
          res.status(400).json({
            success: false,
            error: 'bgmVolume 必须是 0-100 之间的数字',
          });
          return;
        }
      }
      
      const updated = preferenceManager.updatePreference(updates);
      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error('Failed to update preference:', error);
      res.status(500).json({
        success: false,
        error: '更新偏好设置失败',
      });
    }
  });

  /**
   * POST /api/preference/reset
   * 重置用户偏好设置为默认值
   */
  router.post('/preference/reset', (req, res) => {
    try {
      const preference = preferenceManager.resetToDefault();
      res.json({
        success: true,
        data: preference,
      });
    } catch (error) {
      console.error('Failed to reset preference:', error);
      res.status(500).json({
        success: false,
        error: '重置偏好设置失败',
      });
    }
  });

  return router;
}
