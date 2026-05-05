# 中国象棋 - 象棋 Online

一款基于 WebSocket 实时通信的中国象棋网页应用，支持本地双人对战和在线多人对战。

## 项目结构

```
/root/ChineseChess/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express 入口 + HTTP 服务器
│   │   ├── routes/game.ts     # REST API 路由
│   │   └── services/
│   │       ├── gameManager.ts # 游戏状态管理
│   │       └── gameServer.ts  # WebSocket 服务器
│   ├── public/               # 静态资源（前端构建产物）
│   └── dist/                 # 编译后的后端 JS
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # 根组件 + 游戏模式逻辑
│   │   ├── components/
│   │   │   ├── ChessBoard.tsx # Canvas 棋盘渲染
│   │   │   └── GameControls.tsx
│   │   └── hooks/
│   │       ├── useGameSocket.ts  # WebSocket 客户端
│   │       └── useLocalGame.ts   # 本地对战逻辑
│   └── vite.config.ts
├── shared/
│   ├── types.ts              # TypeScript 类型定义
│   └── gameLogic.ts          # 纯函数走法校验
├── chess.config.ts           # 运行时配置
└── package.json             # Monorepo 风格脚本
```

## 快速开始

```bash
npm install
npm run dev          # 启动后端 (3000) + 前端 (5173)
npm run build        # 构建前端 → backend/public，编译后端
npm start            # 仅运行编译后的后端
```

## 配置

运行时配置位于 `chess.config.ts`，支持通过环境变量覆盖：

| 配置项 | 默认值 | 环境变量 |
|--------|--------|----------|
| 服务器端口 | `3000` | `PORT` |
| Session 密钥 | `'chinese-chess-secret-key-2024'` | `SESSION_SECRET` |
| 开启 AI | `false` | `ENABLE_AI` |
| AI 端点 | `undefined` | `AI_ENDPOINT` |

---

## REST API

基础路径：`http://host:port/api/game`

### `POST /api/game/player-id`

生成一个新的唯一玩家 ID，并存入当前 session。

**请求：** 无需 body。

**响应：**
```json
{
  "playerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### `POST /api/game/create`

创建一局新游戏，返回游戏 ID 和初始状态 `waiting`。

**请求：** 无需 body。

**响应：**
```json
{
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "waiting"
}
```

---

### `GET /api/game/:gameId`

根据游戏 ID 获取当前游戏状态。

**参数：**
- `gameId`（路径参数）— 游戏的 UUID

**响应 (200)：**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "board": [[...], ...],  // 10×9 数组，null = 空位
  "currentTurn": "red",
  "moves": [],
  "status": "waiting",
  "redPlayer": "playerId-or-undefined",
  "blackPlayer": "playerId-or-undefined",
  "winner": null,
  "lastMoveTime": 1234567890,
  "createdAt": 1234567890
}
```

**响应 (404)：** `{ "error": "Game not found" }`

---

### `POST /api/game/:gameId/join`

加入一局已有游戏，可选择执红或执黑。

**参数：**
- `gameId`（路径参数）— 游戏的 UUID

**请求体：**
```json
{
  "playerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "side": "red"   // 可选："red" 或 "black"，省略则自动分配
}
```

**响应 (200)：**
```json
{
  "success": true,
  "game": { <GameState> }
}
```

**响应 (400)：** `{ "error": "Failed to join game" }` 或 `{ "error": "playerId required" }`

---

## WebSocket API

**端点：** `ws://host:port/ws?playerId=<playerId>`

WebSocket 传输处理实时游戏操作。所有消息均为 JSON，遵循统一信封格式：

```typescript
interface GameMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
  gameId: string;
}
```

### 消息类型

| MessageType | 方向 | 说明 |
|-------------|------|------|
| `JOIN_GAME` | 客户端 → 服务器 | 加入或创建游戏 |
| `LEAVE_GAME` | 客户端 → 服务器 | 离开当前游戏 |
| `MAKE_MOVE` | 客户端 → 服务器 | 发送走子坐标 |
| `GAME_STATE` | 服务器 → 客户端 | 完整状态广播 |
| `PLAYER_DISCONNECTED` | 服务器 → 客户端 | 通知玩家离开 |
| `PLAYER_RECONNECTED` | 服务器 → 客户端 | （已定义但未实现） |
| `GAME_OVER` | 服务器 → 客户端 | 游戏结束通知 |
| `ERROR` | 服务器 → 客户端 | 错误响应 |
| `PING` | 客户端 → 服务器 | 心跳探测 |
| `PONG` | 双向 | 心跳响应 |
| `AI_MOVE` | 客户端 → 服务器 | 请求 AI 走棋 |

---

### 客户端 → 服务器消息

#### `JOIN_GAME`

加入或创建游戏。若省略 `gameId`，则创建新游戏。

```json
{
  "type": "join_game",
  "payload": {
    "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "side": "red"
  },
  "timestamp": 1234567890,
  "gameId": ""
}
```

**响应：** 服务器向所有玩家广播 `GAME_STATE`。

---

#### `MAKE_MOVE`

发送走子起点和终点坐标。

```json
{
  "type": "make_move",
  "payload": {
    "from": { "row": 9, "col": 4 },
    "to": { "row": 8, "col": 4 }
  },
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**响应：** 服务器向所有玩家广播 `GAME_STATE`（含 `lastMove` 字段）。若游戏结束，还会发送 `GAME_OVER`。

---

#### `LEAVE_GAME`

离开当前游戏。服务器向剩余玩家广播 `PLAYER_DISCONNECTED`。

```json
{
  "type": "leave_game",
  "payload": {},
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

#### `PING`

心跳探测，服务器返回 `PONG`。

```json
{
  "type": "ping",
  "payload": {},
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

#### `AI_MOVE`

请求 AI 走棋。当前除非 `chessConfig.ai.enabled` 为 true，否则返回 `ERROR`（"AI not yet implemented"）。

```json
{
  "type": "ai_move",
  "payload": {},
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### 服务器 → 客户端消息

#### `GAME_STATE`

完整游戏状态广播。每次状态变更（加入、走棋）都会发送。

```json
{
  "type": "game_state",
  "payload": {
    "game": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "board": [[...], ...],
      "currentTurn": "red",
      "moves": [{ "from": {...}, "to": {...}, "piece": {...}, "capturedPiece": null }],
      "status": "playing",
      "winner": null,
      "lastMoveTime": 1234567890,
      "createdAt": 1234567890
    },
    "yourSide": "red",
    "lastMove": {
      "from": { "row": 9, "col": 4 },
      "to": { "row": 8, "col": 4 }
    }
  },
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

#### `PLAYER_DISCONNECTED`

通知有玩家离开了游戏。

```json
{
  "type": "player_disconnected",
  "payload": {
    "playerId": "x1y2z3w4-...",
    "message": "Player disconnected",
    "game": { <GameState> }
  },
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

#### `GAME_OVER`

游戏结束时发送。

```json
{
  "type": "game_over",
  "payload": {
    "winner": "red",
    "reason": "general_captured"
  },
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

`reason` 取值为 `"general_captured"`（将死）或 `"player_disconnect"`（判负）。

---

#### `ERROR`

操作无效时的错误响应。

```json
{
  "type": "error",
  "payload": { "error": "Invalid move - not your turn" },
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

#### `PONG`

心跳响应。

```json
{
  "type": "pong",
  "payload": { "connected": true },
  "timestamp": 1234567890,
  "gameId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### 通信流程

#### 连接建立

```
客户端                              服务器
  |                                    |
  |-- connect /ws?playerId=xxx ------>|
  |<------- pong (connected:true) ----|  （初始握手）
  |                                    |
  |-- join_game --------------------->|
  |    { gameId?: string, side? }     |  （无 gameId 则创建新游戏）
  |                                    |
  |<------ game_state ----------------|  （向所有玩家广播）
  |    { game, yourSide }             |
```

#### 对局循环

```
客户端（红方）                      服务器
  |                                    |
  |-- make_move ---------------------->|
  |    { from: {row,col}, to: {...}} |
  |                                    |
  |<------ game_state ----------------|  （广播含 lastMove）
  |    { game, yourSide, lastMove }  |
  |                                    |
客户端（黑方）                        |
  |                                    |
  |<------ game_state ----------------|  （同上广播）
  |    { game, yourSide, lastMove }  |
  |                                    |
  |-- make_move ---------------------->|
  |    { from: {row,col}, to: {...}} |
  |                                    |
  |<------ game_state ----------------|
  |<------ game_over -----------------|  （游戏结束时）
  |    { winner, reason }             |
```

#### 断线与重连

```
断线时：
  1. 服务器向剩余玩家广播 PLAYER_DISCONNECTED
  2. 服务器启动 30 秒宽限期
  3. 若玩家在 30 秒内重连 → 重新加入游戏
  4. 若超时 → 判负，发送 GAME_OVER

重连时：
  - 客户端使用相同 playerId 调用 join_game
  - 服务器恢复其与现有游戏的连接
```

---

### 连接与心跳

**连接时：**
1. 从 URL 查询参数解析 `playerId`
2. 缺失则拒绝连接（code 1008）
3. 在连接 Map 中注册玩家
4. 发送初始 `PONG`（含 `{ connected: true }`）

**服务器心跳间隔：**
- 服务器每 30 秒发送一次 WebSocket ping
- 若客户端无响应，连接被终止

**客户端重连：**
- WebSocket 关闭后，客户端等待 3 秒后重连
- 重连通过 session playerId 保持玩家身份

---

## 游戏状态类型

### `PieceType`（棋子类型）

| 值 | 说明 |
|----|------|
| `GENERAL` | 将/帅 |
| `ADVISOR` | 士/仕 |
| `ELEPHANT` | 象/相 |
| `HORSE` | 马 |
| `CHARIOT` | 车 |
| `CANNON` | 炮 |
| `SOLDIER` | 兵/卒 |

### `Side`（执方）

| 值 | 说明 |
|----|------|
| `RED` | 红方（先手） |
| `BLACK` | 黑方 |

### `GameStatus`（游戏状态）

| 值 | 说明 |
|----|------|
| `WAITING` | 等待第二位玩家加入 |
| `PLAYING` | 对局进行中 |
| `FINISHED` | 对局结束（将死） |
| `ABORTED` | 对局终止（逃跑/掉线） |

### `Position`（坐标）

```typescript
{ "row": number, "col": number }
// row: 0-9（0 = 黑方底线）
// col: 0-8
```

### `Piece`（棋子）

```typescript
{
  "id": "r1",       // 例如 "r1" = 红方车1
  "type": "CHARIOT",
  "side": "RED",
  "position": { "row": 9, "col": 0 }
}
```

### `Move`（一步棋）

```typescript
{
  "from": { "row": 9, "col": 0 },
  "to": { "row": 9, "col": 4 },
  "piece": { <Piece> },
  "capturedPiece": null | { <Piece> }
}
```

---

## 初始棋盘布局

```
           0    1    2    3    4    5    6    7    8
        ┌────┬────┬────┬────┬────┬────┬────┬────┬────┐
     0  │ b1 │ b2 │ b3 │ b4 │ b5 │ b6 │ b7 │ b8 │ b9 │  ← 黑方底线
        ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
     1  │    │    │    │    │    │    │    │    │    │
        ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
     2  │    │b10 │    │    │    │    │    │b11 │    │  ← 黑方炮
        ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
     3  │b12 │    │b13 │    │b14 │    │b15 │    │b16 │  ← 黑方卒
        ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
     4  │    │    │    │    │    │    │    │    │    │
        ├────┼────┴────┴────┴────┴────┴────┴────┼────┤
     5  │    │    │    │    │    │    │    │    │    │  ← "楚 河" / "汉 界"
        ├────┼────┴────┴────┴────┴────┴────┴────┼────┤
     6  │r12 │    │r13 │    │r14 │    │r15 │    │r16 │  ← 红方兵
        ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
     7  │    │r10 │    │    │    │    │    │r11 │    │  ← 红方炮
        ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
     8  │    │    │    │    │    │    │    │    │    │
        ├────┼────┼────┼────┼────┼────┼────┼────┼────┤
     9  │ r1 │ r2 │ r3 │ r4 │ r5 │ r6 │ r7 │ r8 │ r9 │  ← 红方底线
        └────┴────┴────┴────┴────┴────┴────┴────┴────┘
```

---

## 游戏生命周期

```
createGame() → WAITING（等待第二位玩家）
                    ↓
              joinGame()（第二位玩家加入）
                    ↓
              PLAYING ←→ 对局进行中
                    ↓
        makeMove() 通过 shared/gameLogic.ts 校验
                    ↓
        isGeneralCaptured() → FINISHED
                    或
              leaveGame() → ABORTED
```

---

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 后端服务端口 |
| `SESSION_SECRET` | Express session 加密密钥 |
| `ENABLE_AI` | 开启 AI 对手（生产环境） |
| `AI_ENDPOINT` | 外部 AI 服务地址 |
| `NODE_ENV` | 生产模式（设为 `production`） |

---

## 技术说明

- **无数据库**：游戏状态仅存储在内存中。游戏结束后 1 小时无活动则自动清理。
- **Session 认证**：通过 `/api/game/player-id` 建立玩家身份，存入 `req.session`。
- **前端构建到后端**：Vite 直接输出到 `backend/public`，一个 `node` 进程即可运行全部服务。
- **后端 tsconfig rootDir 为 `..`**：编译产物路径为 `backend/dist/backend/src/`。
- **走法校验**：所有棋子移动规则均在 `shared/gameLogic.ts`，后端在每个 `MAKE_MOVE` 请求时调用 `isValidMove()` 进行校验。
