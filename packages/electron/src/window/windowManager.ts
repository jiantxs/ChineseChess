/**
 * 窗口管理 - 创建和控制 Electron 窗口
 */

import { BrowserWindow, screen, Menu } from 'electron';
import * as path from 'path';
import { MessageBusSubscriber } from '@chess/messagebus';
import type { LoggerInstance } from '@chess/logger';

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

/**
 * Creates the main application window.
 *
 * @param port - The port the backend is running on
 * @param prefix - The URL prefix (e.g., '/uuid')
 * @param logger - Logger instance
 * @param displayPrefs - Display preferences
 */
export function createWindow(
  port: number,
  prefix: string = '',
  logger: LoggerInstance | null,
  displayPrefs?: { resolution?: string }
): BrowserWindow {
  let windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: '象棋',
    icon: path.resolve(__dirname, '../../assets/icon.png'),
    resizable: false,
  };

  // 应用保存的分辨率设置
  if (displayPrefs?.resolution) {
    if (displayPrefs.resolution === 'fullscreen') {
      windowOptions.fullscreen = true;
    } else {
      const [width, height] = displayPrefs.resolution.split('x').map(Number);
      if (width && height) {
        windowOptions.width = width;
        windowOptions.height = height;
      }
    }
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Load the frontend from the backend server with prefix
  const url = `http://127.0.0.1:${port}${prefix}`;
  logger?.logSystemEvent('Loading URL', { url });
  mainWindow.loadURL(url);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 完全禁用菜单栏
  Menu.setApplicationMenu(null);

  return mainWindow;
}

/**
 * 设置 MessageBus 订阅，监听后端发来的窗口控制命令
 */
export function setupMessageBus(
  window: BrowserWindow,
  logger: LoggerInstance | null,
  getPreferenceManager: () => any
): MessageBusSubscriber {
  const messageBusSubscriber = new MessageBusSubscriber();

  // 监听窗口大小调整
  messageBusSubscriber.on('WINDOW_RESIZE', (payload: { width: number; height: number }) => {
    if (!window.isDestroyed()) {
      if (window.isFullScreen()) {
        window.setFullScreen(false);
      }
      if (!window.isMenuBarVisible()) {
        window.setMenuBarVisibility(true);
      }
      window.setBounds({
        x: Math.round((screen.getPrimaryDisplay().workAreaSize.width - payload.width) / 2),
        y: Math.round((screen.getPrimaryDisplay().workAreaSize.height - payload.height) / 2),
        width: payload.width,
        height: payload.height
      });
      logger?.logSystemEvent('Window resized', { width: payload.width, height: payload.height });
    }
  });

  // 监听全屏模式切换
  messageBusSubscriber.on('WINDOW_FULLSCREEN', (payload: { enabled: boolean }) => {
    if (!window.isDestroyed()) {
      if (payload.enabled) {
        window.setResizable(true);
        window.setFullScreen(true);
        window.once('enter-full-screen', () => {
          window.setResizable(false);
          logger?.logSystemEvent('Window switched to fullscreen mode');
        });
      } else {
        const prefs = getPreferenceManager()?.getPreference();
        const res = prefs?.display?.resolution?.value;
        if (res && res !== 'fullscreen') {
          const [w, h] = res.split('x').map(Number);
          window.setFullScreen(false);
          window.setMenuBarVisibility(true);
          window.setBounds({
            x: Math.round((screen.getPrimaryDisplay().workAreaSize.width - w) / 2),
            y: Math.round((screen.getPrimaryDisplay().workAreaSize.height - h) / 2),
            width: w,
            height: h
          });
          logger?.logSystemEvent('Window restored', { width: w, height: h });
        }
      }
    }
  });

  logger?.logSystemEvent('MessageBus subscriber setup complete');

  return messageBusSubscriber;
}
