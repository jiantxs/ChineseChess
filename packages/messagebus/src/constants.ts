/**
 * 消息类型常量定义
 */

export const MessageTypes = {
  WINDOW_RESIZE: 'WINDOW_RESIZE' as const,
  WINDOW_FULLSCREEN: 'WINDOW_FULLSCREEN' as const,
  WINDOW_BORDERLESS: 'WINDOW_BORDERLESS' as const,
  WINDOW_RESTORE: 'WINDOW_RESTORE' as const,
  PING: 'PING' as const,
  PONG: 'PONG' as const
};

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
