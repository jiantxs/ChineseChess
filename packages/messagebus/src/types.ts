/**
 * 消息总线类型定义
 */

import type { MessageType } from './constants.js';

export interface BusMessage<T = unknown> {
  id: string;
  type: MessageType;
  payload: T;
  timestamp: number;
  source: 'backend' | 'electron';
}

export interface WindowResizePayload {
  width: number;
  height: number;
}

export interface WindowFullscreenPayload {
  enabled: boolean;
}

export type MessageHandler<T = unknown> = (payload: T, message: BusMessage) => void;
