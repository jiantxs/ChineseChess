"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_BOARD = exports.BOARD_COLS = exports.BOARD_ROWS = exports.MessageType = exports.GameStatus = exports.Side = exports.PieceType = void 0;
var PieceType;
(function (PieceType) {
    PieceType["GENERAL"] = "general";
    PieceType["ADVISOR"] = "advisor";
    PieceType["ELEPHANT"] = "elephant";
    PieceType["HORSE"] = "horse";
    PieceType["CHARIOT"] = "chariot";
    PieceType["CANNON"] = "cannon";
    PieceType["SOLDIER"] = "soldier";
})(PieceType || (exports.PieceType = PieceType = {}));
var Side;
(function (Side) {
    Side["RED"] = "red";
    Side["BLACK"] = "black";
})(Side || (exports.Side = Side = {}));
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "waiting";
    GameStatus["PLAYING"] = "playing";
    GameStatus["FINISHED"] = "finished";
    GameStatus["ABORTED"] = "aborted";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
var MessageType;
(function (MessageType) {
    MessageType["JOIN_GAME"] = "join_game";
    MessageType["LEAVE_GAME"] = "leave_game";
    MessageType["MAKE_MOVE"] = "make_move";
    MessageType["GAME_STATE"] = "game_state";
    MessageType["PLAYER_DISCONNECTED"] = "player_disconnected";
    MessageType["PLAYER_RECONNECTED"] = "player_reconnected";
    MessageType["GAME_OVER"] = "game_over";
    MessageType["ERROR"] = "error";
    MessageType["PING"] = "ping";
    MessageType["PONG"] = "pong";
    MessageType["AI_MOVE"] = "ai_move";
})(MessageType || (exports.MessageType = MessageType = {}));
exports.BOARD_ROWS = 10;
exports.BOARD_COLS = 9;
exports.INITIAL_BOARD = [
    { id: 'r1', type: PieceType.CHARIOT, side: Side.RED, position: { row: 9, col: 0 } },
    { id: 'r2', type: PieceType.HORSE, side: Side.RED, position: { row: 9, col: 1 } },
    { id: 'r3', type: PieceType.ELEPHANT, side: Side.RED, position: { row: 9, col: 2 } },
    { id: 'r4', type: PieceType.ADVISOR, side: Side.RED, position: { row: 9, col: 3 } },
    { id: 'r5', type: PieceType.GENERAL, side: Side.RED, position: { row: 9, col: 4 } },
    { id: 'r6', type: PieceType.ADVISOR, side: Side.RED, position: { row: 9, col: 5 } },
    { id: 'r7', type: PieceType.ELEPHANT, side: Side.RED, position: { row: 9, col: 6 } },
    { id: 'r8', type: PieceType.HORSE, side: Side.RED, position: { row: 9, col: 7 } },
    { id: 'r9', type: PieceType.CHARIOT, side: Side.RED, position: { row: 9, col: 8 } },
    { id: 'r10', type: PieceType.CANNON, side: Side.RED, position: { row: 7, col: 1 } },
    { id: 'r11', type: PieceType.CANNON, side: Side.RED, position: { row: 7, col: 7 } },
    { id: 'r12', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 0 } },
    { id: 'r13', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 2 } },
    { id: 'r14', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 4 } },
    { id: 'r15', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 6 } },
    { id: 'r16', type: PieceType.SOLDIER, side: Side.RED, position: { row: 6, col: 8 } },
    { id: 'b1', type: PieceType.CHARIOT, side: Side.BLACK, position: { row: 0, col: 0 } },
    { id: 'b2', type: PieceType.HORSE, side: Side.BLACK, position: { row: 0, col: 1 } },
    { id: 'b3', type: PieceType.ELEPHANT, side: Side.BLACK, position: { row: 0, col: 2 } },
    { id: 'b4', type: PieceType.ADVISOR, side: Side.BLACK, position: { row: 0, col: 3 } },
    { id: 'b5', type: PieceType.GENERAL, side: Side.BLACK, position: { row: 0, col: 4 } },
    { id: 'b6', type: PieceType.ADVISOR, side: Side.BLACK, position: { row: 0, col: 5 } },
    { id: 'b7', type: PieceType.ELEPHANT, side: Side.BLACK, position: { row: 0, col: 6 } },
    { id: 'b8', type: PieceType.HORSE, side: Side.BLACK, position: { row: 0, col: 7 } },
    { id: 'b9', type: PieceType.CHARIOT, side: Side.BLACK, position: { row: 0, col: 8 } },
    { id: 'b10', type: PieceType.CANNON, side: Side.BLACK, position: { row: 2, col: 1 } },
    { id: 'b11', type: PieceType.CANNON, side: Side.BLACK, position: { row: 2, col: 7 } },
    { id: 'b12', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 0 } },
    { id: 'b13', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 2 } },
    { id: 'b14', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 4 } },
    { id: 'b15', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 6 } },
    { id: 'b16', type: PieceType.SOLDIER, side: Side.BLACK, position: { row: 3, col: 8 } },
];
//# sourceMappingURL=types.js.map