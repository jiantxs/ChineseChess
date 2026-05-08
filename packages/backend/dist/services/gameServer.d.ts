/**
 * @fileoverview WebSocket game server handling real-time multiplayer
 * @module backend/src/services/gameServer
 *
 * Manages WebSocket connections for Chinese Chess multiplayer games.
 * Handles player authentication, game creation/joining, move validation,
 * and real-time game state synchronization.
 *
 * @author Chinese Chess Development Team
 * @version 1.0.0
 */
import { GameManager } from '@chess/core';
/**
 * WebSocket game server for real-time multiplayer Chinese Chess
 * @class GameServer
 * @description Manages WebSocket connections, game state synchronization,
 *              player authentication via playerId query param, and automatic
 *              cleanup of inactive games and connections.
 *
 * @remarks
 * - Listens on path '/ws' for WebSocket connections
 * - Requires 'playerId' query parameter for connection authentication
 * - Implements 30-second ping/pong health checks
 * - Implements 10-minute cleanup interval for inactive games
 * - 30-second reconnect window before player forfeit
 *
 * @example
 * const server = createServer(app);
 * const gameServer = new GameServer(server, gameManager);
 * // Server stops on SIGTERM via gameServer.stop()
 */
export declare class GameServer {
    /** WebSocket server instance */
    private wss;
    /** Map of playerId to ConnectedPlayer for all active connections */
    private players;
    /** Reference to GameManager singleton for game operations */
    private gameManager;
    /** Interval handle for ping/pong health checks (30 seconds) */
    private pingInterval;
    /** Interval handle for inactive game cleanup (10 minutes) */
    private cleanupInterval;
    /**
     * Create a new GameServer instance
     * @constructor
     * @param server - HTTP server to attach WebSocket server to
     * @param gameManager - GameManager instance for game operations
     *
     * @remarks
     * - Creates WebSocketServer on '/ws' path
     * - Automatically starts ping interval and cleanup interval
     * - Sets up connection handler for new WebSocket clients
     */
    constructor(server: import('http').Server | import('https').Server, gameManager: GameManager);
    /**
     * Set up WebSocket server connection handler
     * @private
     * @description Registers event handlers for:
     *              - Connection (validates playerId, registers player)
     *              - Message (parses JSON, routes to handler)
     *              - Close (handles disconnect with reconnect window)
     *              - Pong (updates isAlive flag)
     *
     * @remarks
     * - Rejects connections without playerId query param with code 1008
     * - Sends initial PONG message on successful connection
     * - Parses messages as JSON GameMessage objects
     * - Logs all events via logWebSocketEvent
     */
    private setupWebSocketServer;
    /**
     * Route incoming message by type to appropriate handler
     * @private
     * @description Dispatches GameMessage to specific handler based on MessageType.
     *              Sends error response for unknown message types.
     *
     * @param player - The ConnectedPlayer who sent the message
     * @param message - The parsed GameMessage to handle
     *
     * @see {@link handleJoinGame}
     * @see {@link handleMakeMove}
     * @see {@link handleLeaveGame}
     * @see {@link handlePing}
     * @see {@link handleAIMove}
     * @see {@link handleGetValidMoves}
     */
    private handleMessage;
    /**
     * Handle JOIN_GAME message - create or join a game
     * @private
     * @description Creates a new game if no gameId provided, or joins existing game.
     *              Loads specified layout or uses standard layout as default.
     *              Broadcasts GAME_STATE to all players in the game.
     *
     * @param player - The ConnectedPlayer joining a game
     * @param message - Message containing optional gameId, side, local flag, layoutName
     *
     * @remarks
     * - If no gameId: creates new game with specified or default layout
     * - If gameId provided: joins existing game if available
     * - Assigns RED/BLACK side based on which player slot is available
     * - Sends GAME_STATE to all players in game with their assigned side
     */
    private handleJoinGame;
    /**
     * Handle MAKE_MOVE message - validate and execute a chess move
     * @private
     * @description Validates move coordinates and player turn, then executes move
     *              via GameManager. Broadcasts updated GAME_STATE to all players.
     *              If game ends, broadcasts GAME_OVER.
     *
     * @param player - The ConnectedPlayer making the move
     * @param message - Message containing from and to positions
     *
     * @remarks
     * - Validates coordinates are within 0-9 (row) and 0-8 (col)
     * - Returns error if player is not in a game
     * - Returns error if move validation fails
     * - Broadcasts GAME_STATE with lastMove info to both players
     * - Broadcasts GAME_OVER when general is captured
     */
    private handleMakeMove;
    /**
     * Handle LEAVE_GAME message - player voluntarily leaves game
     * @private
     * @description Removes player from current game via GameManager.
     *              Broadcasts PLAYER_DISCONNECTED to remaining players.
     *
     * @param player - The ConnectedPlayer leaving the game
     * @param message - The leave game message (payload unused)
     *
     * @remarks
     * - Player's gameId and side are cleared after leaving
     * - Remaining players receive updated game state
     * - Game continues with remaining player until finished
     */
    private handleLeaveGame;
    /**
     * Handle PING message - respond with PONG and update timestamp
     * @private
     * @description Updates player's lastPing and responds with PONG message.
     *              Used by client to keep connection alive and verify server responsiveness.
     *
     * @param player - The ConnectedPlayer who sent the ping
     *
     * @remarks
     * - Returns current server timestamp in response
     * - lastPing updated for connection health tracking
     */
    private handlePing;
    /**
     * Handle AI_MOVE message - request AI move calculation
     * @private
     * @description Placeholder for AI opponent integration.
     *              Returns error indicating AI is not yet implemented.
     *
     * @param player - The ConnectedPlayer requesting AI move
     * @param message - The AI move request message
     *
     * @remarks
     * - Returns error if AI is not enabled via chessConfig
     * - Returns error "AI not yet implemented" when AI feature is requested
     * - AI integration would go here when ENABLE_AI is fully implemented
     */
    private handleAIMove;
    /**
     * Handle GET_VALID_MOVES message - get legal moves for a piece
     * @private
     * @description Queries GameManager for all valid moves for a piece at given position.
     *              Returns array of valid destination positions.
     *
     * @param player - The ConnectedPlayer requesting valid moves
     * @param message - Message containing position of piece to evaluate
     *
     * @returns VALID_MOVES message with array of valid destination positions
     *
     * @remarks
     * - Position coordinates must be valid numbers
     * - Returns empty array if no valid moves available
     * - Used by frontend to highlight valid move destinations
     */
    private handleGetValidMoves;
    /**
     * Handle WebSocket disconnect - manage cleanup and reconnect window
     * @private
     * @description Processes player disconnection:
     *              - Clears any pending reconnect timeout
     *              - Broadcasts PLAYER_DISCONNECTED to game
     *              - Sets 30-second reconnect window before forfeit
     *              - Removes player from players map after timeout
     *
     * @param player - The ConnectedPlayer who disconnected
     *
     * @remarks
     * - If player reconnects within timeout, they keep their game slot
     * - If timeout expires, player is forfeited and game may end
     * - Uses chessConfig.game.reconnectTimeoutMs for timeout duration
     */
    private handleDisconnect;
    /**
     * Send a message to a specific player
     * @private
     * @description Serializes and sends GameMessage to player's WebSocket
     *              if connection is in OPEN state.
     *
     * @param player - The ConnectedPlayer to send message to
     * @param message - The GameMessage to send
     *
     * @remarks
     * - Checks readyState before sending to avoid errors
     * - JSON stringifies the message object
     */
    private sendToPlayer;
    /**
     * Broadcast a message to all players in a game
     * @private
     * @description Sends a message to all connected players currently in the specified game.
     *
     * @param gameId - The game ID to broadcast to
     * @param message - The GameMessage to send to each player
     *
     * @see {@link sendToPlayer}
     */
    private broadcastToGame;
    /**
     * Send an error message to a player
     * @private
     * @description Convenience method to send ERROR message type to player.
     *
     * @param player - The ConnectedPlayer to send error to
     * @param error - Error message string
     *
     * @see {@link sendToPlayer}
     */
    private sendError;
    /**
     * Remove sensitive data from game state before sending to client
     * @private
     * @description Creates sanitized game state object that:
     *              - Omits actual player IDs (replaced with booleans)
     *              - Only includes safe fields for client consumption
     *
     * @param game - Full GameState from GameManager
     * @returns Sanitized game state object safe for client
     */
    private sanitizeGameState;
    /**
     * Start ping interval for connection health checks
     * @private
     * @description Starts 30-second interval that:
     *              - Sets isAlive = false for all players
     *              - Sends ping to each player
     *              - Terminates connection if pong not received (isAlive stays false)
     *
     * @remarks
     * - Uses WebSocket ping() method
     * - Pong handler sets isAlive = true
     * - Connections without pong response are terminated
     */
    private startPingInterval;
    /**
     * Start cleanup interval for inactive games
     * @private
     * @description Starts 10-minute interval that:
     *              - Calls GameManager.cleanupInactiveGames(3600000)
     *              - Logs number of games cleaned up if any
     *
     * @remarks
     * - Cleans up games inactive for 1 hour (3600000 ms)
     * - Only logs when games are actually cleaned
     */
    private startCleanupInterval;
    /**
     * Gracefully stop the game server
     * @description Stops all intervals and closes WebSocket server.
     *              Called during SIGTERM shutdown.
     *
     * @remarks
     * - Clears ping interval if running
     * - Clears cleanup interval if running
     * - Closes WebSocket server (no new connections accepted)
     * - Existing connections will be terminated
     */
    stop(): void;
}
//# sourceMappingURL=gameServer.d.ts.map