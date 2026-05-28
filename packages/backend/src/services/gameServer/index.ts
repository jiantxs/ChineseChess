/**
 * @fileoverview 向后兼容的 GameServer 重新导出
 * @module backend/src/services/gameServer
 *
 * 提供向后兼容的导出，将 GameServer 和 ConnectedPlayer
 * 从拆分后的模块重新导出。
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */

// 主类向后兼容导出
export { GameServer } from './gameServer';

// 类型导出（供内部使用）
export type { ConnectedPlayer } from './types';

// 子模块导出（供内部使用）
export {
  sendToPlayer,
  broadcastToGame,
  sendError,
  handleDisconnect,
} from './connectionManager';

export {
  handleMessage,
  handleJoinGame,
  handleMakeMove,
  handleLeaveGame,
  handlePing,
  handleAIMove,
  handleAIMoveInGame,
  handleGetValidMoves,
  sanitizeGameState,
  setupWebSocketServer,
} from './messageHandlers';

export {
  startPingInterval,
  startCleanupInterval,
} from './healthMonitor';