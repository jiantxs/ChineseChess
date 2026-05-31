# 象棋 - 中国象棋在线对弈平台

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blueviolet)
![pnpm](https://img.shields.io/badge/pnpm-Workspace-orange)

基于 WebSocket 实时对战的中国象棋（ Xiangqi ）应用，支持本地双人对弈和在线多人匹配。

## 功能特性

### 游戏模式

| 模式 | 说明 |
|------|------|
| **本地对战** | 同设备双人对弈，界面左右两侧显示相同棋盘 |
| **在线对战** | 通过 WebSocket 实时同步，支持创建房间和加入匹配 |

### 核心功能

- **完整象棋规则**：车马象士帅炮兵，遵循标准走法与吃子规则
- **胜负判定**：将军、困毙自动判断，支持 AI 对战接口（预留）
- **游戏回放**：GameLogger 记录完整棋谱，支持 JSON 导出
- **布局预设**：支持多种开局阵型，通过 Layout Registry 扩展

### 技术架构

- **前端**：React 19 + Canvas 棋盘渲染，SVG 棋子图片
- **后端**：Express 4 + WebSocket (ws 8.16)，Winston 日志
- **状态管理**：GameManager 单例模式，纯内存存储
- **配置系统**：ChessConfig 接口，支持环境变量覆盖

## 快速开始

```bash
# 安装依赖
pnpm install

# 编译
pnpm build

# 开始运行(将会在http://localhost:3000/abcc)

pnpm start 
```

访问 `http://localhost:3000/abcc` 开始游戏

## 项目结构

```
ChineseChess/
├── packages/
│   ├── core/           # 游戏逻辑核心（走法验证、棋子类型、GameManager）
│   ├── types/          # TypeScript 类型定义（Pieces, Position, GameState）
│   ├── config/         # 运行时配置（环境变量覆盖机制）
│   ├── logger/         # Winston 日志封装（Request/Error/Event）
│   ├── game-records/   # 棋盘布局注册表（预设开局阵型）
│   ├── preference/    # 用户偏好设置（音量、主题等）
│   ├── backend/        # Express 服务器 + WebSocket 游戏服务
│   ├── frontend/       # React UI（Canvas 棋盘、WebSocket 客户端）
│   └── electron/       # 桌面客户端（Electron 打包）
├── logs/
│   ├── requests/       # HTTP 请求日志
│   ├── errors/         # 错误日志
│   ├── events/        # 系统事件日志
│   └── games/          # 游戏对局日志
├── winapp/             # Windows 桌面应用资源
└── mobile/            # 移动端相关资源
```

### 核心模块说明

| 模块 | 文件 | 职责 |
|------|------|------|
| **isValidMove** | `core/src/gameLogic.ts` | 走法验证分发器，根据棋子类型调用对应验证函数 |
| **GameManager** | `core/src/gameManager.ts` | 游戏状态管理，创建/加入/结束游戏，内存 Map 存储 |
| **PieceLayout** | `core/src/pieceLayout.ts` | 棋盘布局工具类，支持 JSON 序列化/反序列化 |
| **GameLogger** | `core/src/gameLogger.ts` | 对局记录器，记录每步棋并导出 JSON |
| **GameServer** | `backend/src/services/gameServer.ts` | WebSocket 处理，30s 心跳，10min 清理过期游戏 |
| **BoardController** | `frontend/src/controllers/BoardController.ts` | 棋子选中状态管理，订阅者模式 |

## 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm build` | 编译所有 packages |
| `pnpm build:electron` | 编译出electron应用 |
| `pnpm typecheck` | TypeScript 类型检查（所有 packages） |
| `pnpm start` | 运行编译后的后端服务 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CCHESSPORT` | 3000 | 服务器端口 |
| `CCHESSHOST` | 0.0.0.0 | 服务器地址 |
| `CCHESSPREFIX` | /abcc | URL 前缀路径 |
| `ENABLE_AI` | false | 是否启用 AI 对手 |
| `AI_ENDPOINT` | undefined | 外部 AI 服务地址 |
| `LOG_LEVEL` | info | 日志级别 |
| `NODE_ENV` | development | 设为 production 启用生产模式 |

## 游戏规则简述

### 胜负条件

- 吃掉对方帅/将即获胜
- 对方无合法走法（困毙）判负

## 注意事项

- **无测试框架**：本项目未配置 Jest/Vitest 等测试工具
- **无 CI/CD**：无 GitHub Actions、Docker 等自动化部署
- **无数据库**：游戏状态纯内存存储，已结束游戏 1 小时后自动清理
- **AI 未实现**：如设置 `ENABLE_AI=true`，返回"AI 尚未实现"提示

## 技术栈

- **运行时**：Node.js 20.x
- **前端**：React 19, Vite, TypeScript strict mode
- **后端**：Express 4, ws 8.16 WebSocket
- **日志**：Winston DailyRotateFile
- **包管理**：pnpm workspace monorepo

## 开发指南

### 添加新的棋子类型

1. 在 `packages/types/src/index.ts` 添加 `PieceType` 枚举值
2. 在 `packages/core/src/gameLogic.ts` 实现对应 `isValidMove` 验证函数
3. 在 `packages/core/src/types.ts` 更新 `INITIAL_BOARD` 初始布局

### 扩展棋盘布局

1. 在 `packages/game-records/src/layouts/` 创建新的布局文件
2. 导出 `PieceLayout` 实例和布局数据
3. 在 `packages/game-records/src/index.ts` 的 registry 中注册

### 添加新的 API 路由

1. 在 `packages/backend/src/routes/` 创建新的路由文件
2. 在 `packages/backend/src/routes/index.ts` 中挂载路由
3. 使用 `app.locals.logger` 记录日志

---