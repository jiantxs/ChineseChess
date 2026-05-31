/**
 * 内存事件总线 - 同进程内的发布订阅机制
 * 使用 Node.js EventEmitter + 消息队列
 */

import { EventEmitter } from 'events';
import type { MessageType } from './constants.js';
import type { BusMessage } from './types.js';

class MessageBusCore extends EventEmitter {
  private messageQueue: BusMessage[] = [];
  private subscribers: Map<MessageType, Set<(msg: BusMessage) => void>> = new Map();
  private isProcessing = false;

  /**
   * 发布消息到总线
   */
  publish<T>(type: MessageType, payload: T, source: 'backend' | 'electron'): void {
    const message: BusMessage<T> = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      source
    };

    this.messageQueue.push(message);
    this.processQueue();
  }

  /**
   * 订阅特定消息类型
   */
  subscribe(type: MessageType, handler: (msg: BusMessage) => void): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }

    this.subscribers.get(type)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.subscribers.get(type)?.delete(handler);
    };
  }

  /**
   * 处理消息队列
   */
  private processQueue(): void {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      const handlers = this.subscribers.get(message.type);

      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error(`[MessageBus] Handler error for ${message.type}:`, error);
          }
        });
      }

      // 同时通过 EventEmitter 触发（兼容传统监听）
      this.emit(message.type, message);
    }

    this.isProcessing = false;
  }

  /**
   * 获取队列状态（调试用）
   */
  getQueueStats(): { queueLength: number; subscriberCount: number } {
    let subscriberCount = 0;
    this.subscribers.forEach(set => subscriberCount += set.size);

    return {
      queueLength: this.messageQueue.length,
      subscriberCount
    };
  }
}

// 模块级单例 - 确保同进程内共享同一个实例
export const messageBus = new MessageBusCore();
