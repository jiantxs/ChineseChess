export declare enum PieceType {
    GENERAL = "general",
    ADVISOR = "advisor",
    ELEPHANT = "elephant",
    HORSE = "horse",
    CHARIOT = "chariot",
    CANNON = "cannon",
    SOLDIER = "soldier"
}
export declare enum Side {
    RED = "red",
    BLACK = "black"
}
export interface Position {
    row: number;
    col: number;
}
export interface Piece {
    id: string;
    type: PieceType;
    side: Side;
    position: Position;
}
export interface Move {
    from: Position;
    to: Position;
    piece: Piece;
    capturedPiece?: Piece;
}
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
}
export declare enum GameStatus {
    WAITING = "waiting",
    PLAYING = "playing",
    FINISHED = "finished",
    ABORTED = "aborted"
}
export interface Player {
    id: string;
    sessionId: string;
    nickname: string;
    side?: Side;
    connected: boolean;
    lastPing: number;
}
export interface GameMessage {
    type: MessageType;
    payload: unknown;
    timestamp: number;
    gameId: string;
}
export declare enum MessageType {
    JOIN_GAME = "join_game",
    LEAVE_GAME = "leave_game",
    MAKE_MOVE = "make_move",
    GAME_STATE = "game_state",
    PLAYER_DISCONNECTED = "player_disconnected",
    PLAYER_RECONNECTED = "player_reconnected",
    GAME_OVER = "game_over",
    ERROR = "error",
    PING = "ping",
    PONG = "pong",
    AI_MOVE = "ai_move"
}
export declare const BOARD_ROWS = 10;
export declare const BOARD_COLS = 9;
export declare const INITIAL_BOARD: Piece[];
//# sourceMappingURL=types.d.ts.map