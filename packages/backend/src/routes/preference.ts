/**
 * @fileoverview 用户偏好设置路由
 * @module backend/src/routes/preference
 *
 * 提供 REST API 用于获取和更新用户偏好设置。
 * 所有偏好数据通过 @chess/preference 包持久化到 preference.json.chess 文件。
 *
 * 路由：
 *   GET  /api/preference       - 获取当前用户偏好
 *   POST /api/preference       - 更新用户偏好
 *   POST /api/preference/reset - 重置为默认偏好
 */

import { Router } from 'express';
import type { ChessConfig } from '@chess/config';
import type { UserPreference } from '@chess/preference';
import { createPreferenceManager } from '@chess/preference';
import { MessageBusPublisher } from '@chess/messagebus';

/**
 * 创建用户偏好设置路由器
 * @param config - ChessConfig 实例
 * @param messageBusPublisher - MessageBus 发布者实例
 * @returns 配置好的 Express Router 实例
 */
export function createPreferenceRouter(config: ChessConfig, messageBusPublisher?: MessageBusPublisher): Router {
  const preferenceManager = createPreferenceManager(config);
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
   * 更新用户偏好设置
   */
  router.post('/preference', (req, res) => {
    try {
      const updates: Partial<UserPreference> = req.body;

      // 验证 enabled
      const enabled = updates.audio?.bgm?.enabled;
      if (enabled !== undefined) {
        if (typeof enabled !== 'object' || enabled === null) {
          res.status(400).json({
            success: false,
            error: 'audio.bgm.enabled 必须是对象',
          });
          return;
        }
        if (enabled.value !== undefined && typeof enabled.value !== 'boolean') {
          res.status(400).json({
            success: false,
            error: 'audio.bgm.enabled.value 必须是布尔值',
          });
          return;
        }
        if (enabled.visible !== undefined && typeof enabled.visible !== 'boolean') {
          res.status(400).json({
            success: false,
            error: 'audio.bgm.enabled.visible 必须是布尔值',
          });
          return;
        }
      }

      // 验证 volume
      const volume = updates.audio?.bgm?.volume;
      if (volume !== undefined) {
        if (typeof volume !== 'object' || volume === null) {
          res.status(400).json({
            success: false,
            error: 'audio.bgm.volume 必须是对象',
          });
          return;
        }
        if (volume.value !== undefined) {
          const volValue = Number(volume.value);
          if (isNaN(volValue) || volValue < 0 || volValue > 100) {
            res.status(400).json({
              success: false,
              error: 'audio.bgm.volume.value 必须是 0-100 之间的数字',
            });
            return;
          }
        }
        if (volume.visible !== undefined && typeof volume.visible !== 'boolean') {
          res.status(400).json({
            success: false,
            error: 'audio.bgm.volume.visible 必须是布尔值',
          });
          return;
        }
      }

      const updated = preferenceManager.updatePreference(updates);

      // 验证 display 设置
      const display = updates.display;
      if (display?.resolution?.value !== undefined) {
        const validResolutions = updated.display?.resolution?.options || [];
        if (validResolutions.length > 0 && !validResolutions.includes(display.resolution.value as string)) {
          res.status(400).json({
            success: false,
            error: '无效的分辨率选项',
          });
          return;
        }
      }

      // 通过 MessageBus 通知 Electron 调整窗口
      if (messageBusPublisher?.isAvailable() && updates.display?.resolution?.value !== undefined) {
        const resolutionValue = updates.display.resolution.value as string;
        if (resolutionValue === 'fullscreen') {
          messageBusPublisher.publish('WINDOW_FULLSCREEN', { enabled: true });
        } else {
          const [width, height] = resolutionValue.split('x').map(Number);
          messageBusPublisher.publish('WINDOW_RESIZE', { width, height });
        }
      }

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