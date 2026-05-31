/**
 * @chess/messagebus - 同进程内存消息总线
 *
 * 提供后端与 Electron 主进程之间的轻量级通信机制
 * 基于 Node.js EventEmitter，零网络开销
 */

// 核心总线（高级用法）
export { messageBus } from './bus.js';
export type { BusMessage } from './types.js';

// 后端发布者
export { MessageBusPublisher } from './server.js';

// Electron 订阅者
export { MessageBusSubscriber } from './client.js';
export type { MessageHandler } from './types.js';

// 常量
export { MessageTypes } from './constants.js';
export type { MessageType } from './constants.js';

// Payload 类型
export type { WindowResizePayload, WindowFullscreenPayload, WindowBorderlessPayload } from './types.js';
