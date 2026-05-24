/**
 * 中国象棋（Xiangqi）的共享类型定义。
 *
 * 此包包含前后端共用的所有类型定义：
 * - 游戏逻辑：棋子类型、红黑方、位置、 move
 * - 状态管理：游戏状态、玩家回合、移动历史
 * - WebSocket 通信：客户端-服务器消息类型
 *
 * @module @chess/types
 */

/**
 * 中国象棋（Xiangqi）中棋子的类型。
 * 每种类型都有特定的移动规则：
 * - GENERAL（将/帅）：在九宫内水平或垂直移动一步
 * - ADVISOR（士/仕）：在九宫内对角线移动一步
 * - ELEPHANT（象/相）：对角线移动两格，不能过河
 * - HORSE（馬/傌）：先水平移动一格，再对角线移动一格（马腿）
 * - CHARIOT（車/俥）：可以水平或垂直移动任意格数
 * - CANNON（炮/砲）：移动方式与车相同，但吃子必须隔一个棋子跳吃
 * - SOLDIER（兵/卒）：过河前只能前进，过河后可以前进或横向移动
 */
export enum PieceType {
  GENERAL = 'general',
  ADVISOR = 'advisor',
  ELEPHANT = 'elephant',
  HORSE = 'horse',
  CHARIOT = 'chariot',
  CANNON = 'cannon',
  SOLDIER = 'soldier',
}

/**
 * 代表中国象棋中对立的双方。
 * - RED（红）：先手，从第9行开始（棋盘下方）
 * - BLACK（黑）：后手，从第0行开始（棋盘上方）
 */
export enum Side {
  RED = 'red',
  BLACK = 'black',
}

/**
 * 代表中国象棋棋盘上的一个位置。
 * 使用 {row, col} 坐标系统，其中：
 * - row：0-9（0 = 黑方底线，9 = 红方底线）
 * - col：0-8（0 = 左边，8 = 右边）
 * 注意：这不是 {x, y}——从红方视角看 row 向下增加
 */
export interface Position {
  row: number;
  col: number;
}

/**
 * 代表棋盘上的一个棋子。
 * 每个棋子都有唯一的 id、决定移动规则的 type、
 * 决定所属玩家的 side，以及当前位置 position。
 */
export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
  position: Position;
}

/**
 * 代表游戏中的一个移动动作。
 * 包含源位置和目标位置、被移动的棋子，
 * 以及如果是吃子则包含被吃的棋子。
 */
export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
}

/**
 * 代表游戏会话的当前状态。
 * - WAITING：游戏已创建，等待第二个玩家加入
 * - PLAYING：双方都已连接，游戏进行中
 * - FINISHED：游戏结束，有赢家或平局
 * - ABORTED：游戏因玩家断开连接或超时而终止
 */
export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
  ABORTED = 'aborted',
}

/**
 * 代表中国象棋游戏的完整状态。
 * 包含棋盘布局、当前回合、移动历史、游戏状态、
 * 玩家信息和用于跟踪的时间戳。
 */
export interface GameState {
  id: string;
  board: (Piece | null)[][];
  currentTurn: Side;
  moves: Move[];
  status: GameStatus;
  winner?: Side;
  redPlayer?: string;
  blackPlayer?: string;
  lastMoveTime: number;
  createdAt: number;
  localGame?: boolean;
  aiGame?: boolean;
  /** AI 难度 (1-10)，仅在 aiGame 为 true 时使用 */
  aiDifficulty?: number;
}

/**
 * 用于客户端-服务器通信的 WebSocket 消息类型。
 * - JOIN_GAME：玩家加入游戏会话
 * - LEAVE_GAME：玩家主动离开
 * - MAKE_MOVE：玩家发送移动动作
 * - GAME_STATE：服务器广播当前棋盘状态
 * - PLAYER_DISCONNECTED/RECONNECTED：连接状态事件
 * - GAME_OVER：游戏结束并宣布赢家
 * - ERROR：错误消息（无效移动等）
 * - PING/PONG：连接保活消息
 * - AI_MOVE：AI 对手下棋
 * - GET_VALID_MOVES/VALID_MOVES：查询棋子的合法移动
 */
export enum MessageType {
  JOIN_GAME = 'join_game',
  LEAVE_GAME = 'leave_game',
  MAKE_MOVE = 'make_move',
  GAME_STATE = 'game_state',
  PLAYER_DISCONNECTED = 'player_disconnected',
  PLAYER_RECONNECTED = 'player_reconnected',
  GAME_OVER = 'game_over',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
  AI_MOVE = 'ai_move',
  GET_VALID_MOVES = 'get_valid_moves',
  VALID_MOVES = 'valid_moves',
  CLIENT_LOG = 'client_log',
}

/**
 * 代表服务器和客户端之间的 WebSocket 消息。
 * 用于所有实时游戏通信，包括移动、
 * 游戏状态更新和连接管理。
 */
export interface GameMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
  gameId: string;
}

/** 棋盘尺寸：10行（0-9）和9列（0-8） */
export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;

/**
 * 带可见性的偏好选项
 * 用于分层偏好设置结构
 */
export interface PreferenceOption<T> {
  /** 选项值 */
  value: T;
  /** 是否可见（用于条件显示配置项） */
  visible: boolean;
}

/**
 * 用户偏好设置接口 - 分层结构
 * 这是前后端共享的偏好配置类型
 */
export interface UserPreference {
  /** 音频设置 */
  audio: {
    /** 背景音乐设置 */
    bgm: {
      /** 是否播放背景音乐 */
      enabled: PreferenceOption<boolean>;
      /** 背景音乐音量大小 (0-100) */
      volume: PreferenceOption<number>;
    };
  };
  /** AI 设置 */
  ai: {
    /** AI 难度 (1-10)，影响搜索深度 */
    difficulty: PreferenceOption<number>;
  };
}

/**
 * 默认用户偏好设置 - 所有选项默认可见
 */
export const defaultUserPreference: UserPreference = {
  audio: {
    bgm: {
      enabled: { value: true, visible: true },
      volume: { value: 100, visible: true },
    },
  },
  ai: {
    difficulty: { value: 5, visible: true },
  },
};