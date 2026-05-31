/**
 * Electron 侧 MessageBus 订阅者
 * 订阅后端发布的事件并执行窗口操作
 */

import { messageBus } from './bus.js';
import type { MessageType } from './constants.js';
import type { BusMessage, MessageHandler } from './types.js';

export class MessageBusSubscriber {
  private unsubscribers: Map<string, () => void> = new Map();

  /**
   * 订阅特定消息类型
   */
  on<T>(type: MessageType, handler: MessageHandler<T>): () => void {
    const unsubscribe = messageBus.subscribe(type, (msg: BusMessage) => {
      handler(msg.payload as T, msg);
    });

    const id = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    this.unsubscribers.set(id, unsubscribe);

    // 返回取消订阅函数
    return () => {
      unsubscribe();
      this.unsubscribers.delete(id);
    };
  }

  /**
   * 订阅一次后自动取消
   */
  once<T>(type: MessageType, handler: MessageHandler<T>): void {
    const unsubscribe = this.on<T>(type, (payload, message) => {
      handler(payload, message);
      unsubscribe();
    });
  }

  /**
   * 清理所有订阅
   */
  dispose(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers.clear();
  }
}
