/**
 * 后端侧 MessageBus 发布者
 * 后端通过此模块发布事件，Electron 侧订阅处理
 */

import { messageBus } from './bus.js';
import type { MessageType } from './constants.js';

export class MessageBusPublisher {
  private isActive = false;

  constructor(private platform: string) {
    // 只在 win 平台激活
    this.isActive = platform === 'win';
  }

  /**
   * 发布消息到总线
   */
  publish<T>(type: MessageType, payload: T): boolean {
    if (!this.isActive) return false;

    messageBus.publish(type, payload, 'backend');
    return true;
  }

  /**
   * 检查总线是否可用
   */
  isAvailable(): boolean {
    return this.isActive;
  }

  /**
   * 获取总线统计
   */
  getStats() {
    return messageBus.getQueueStats();
  }
}
