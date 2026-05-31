/**
 * Electron main process for Chinese Chess desktop application.
 *
 * Features:
 * - Scans for an available high port (30000-50000, randomized)
 * - Starts backend server directly (same Node.js process)
 * - Opens a window pointing to the local server
 * - Manages process lifecycle (cleanup on exit)
 */

import { app } from 'electron';
import { createPreferenceManager } from '@chess/preference';
import { LoggerFactory } from '@chess/logger';
import type { LoggerInstance } from '@chess/logger';
import { findAvailablePort } from './utils/portUtils.js';
import { createWindow, setupMessageBus, getMainWindow, setMainWindow } from './window/windowManager.js';
import { startMainServer, startMobileServer } from './server/serverManager.js';
import { calculateResolutionOptions } from './utils/screenResolutions.js';
import * as path from 'path';
import { randomUUID } from 'crypto';

// Global state
let logger: LoggerInstance | null = null;
let stopServer: (() => void) | null = null;
let stopMobileServer: (() => void) | null = null;
let messageBusSubscriber: any = null;
let mainPreferenceManager: ReturnType<typeof createPreferenceManager> | null = null;

/**
 * Main application entry point.
 */
async function main(): Promise<void> {
  try {
    // Find an available port
    const port = await findAvailablePort();

    // Generate random UUID as base URL prefix
    const basePrefix = `/${randomUUID()}`;

    // Determine the correct public path for static assets
    const isPackaged = app.isPackaged;
    const publicPath = isPackaged
      ? path.resolve(app.getAppPath(), 'dist', 'public')
      : path.resolve(__dirname, '../../backend/public');

    // Start backend server directly in the same process
    const { stop, config } = startMainServer(port, basePrefix, publicPath, logger!);
    stopServer = stop;

    // Initialize logger after config is available
    const loggerFactory = new LoggerFactory();
    logger = loggerFactory.createLogger(config);

    logger.logSystemEvent('Found available port', { port });
    logger.logSystemEvent('Generated base prefix', { basePrefix });
    logger.logSystemEvent('Public path resolved', { publicPath, isPackaged });
    logger.logSystemEvent('Starting backend server');

    // Create preference manager instance bound to main config
    mainPreferenceManager = createPreferenceManager(config);

    // 检测屏幕分辨率并计算可用选项
    const resolutionOptions = calculateResolutionOptions();
    const optionValues = resolutionOptions.map(opt => opt.value);
    logger.logSystemEvent('Screen detected resolutions', { resolutions: optionValues });

    // 检查当前保存的分辨率是否在新选项中
    const currentPrefs = mainPreferenceManager.getPreference();
    const currentResolution = currentPrefs.display?.resolution?.value;

    // 如果当前分辨率不在可用选项中，重置为最接近的选项
    let newResolutionValue = currentResolution;
    if (currentResolution && !optionValues.includes(currentResolution)) {
      const currentWidth = parseInt(currentResolution.split('x')[0]);
      newResolutionValue = resolutionOptions
        .filter(opt => opt.width <= currentWidth)
        .sort((a, b) => b.width - a.width)[0]?.value
        || resolutionOptions[0].value;
      logger.logSystemEvent('Resolution adjusted', { from: currentResolution, to: newResolutionValue });
    }

    // 更新 preference 中的可用选项
    mainPreferenceManager!.updatePreference({
      display: {
        label: '显示设置',
        resolution: {
          value: newResolutionValue || resolutionOptions[0].value,
          visible: true,
          label: '窗口分辨率',
          valueType: 'string',
          options: optionValues
        }
      }
    });

    // Handle extra mobile server
    const mobileResult = await startMobileServer(config, publicPath, mainPreferenceManager, logger);
    stopMobileServer = mobileResult.stop;

    // Create the window with prefix URL and display preferences
    const prefs = mainPreferenceManager!.getPreference();
    const window = createWindow(port, basePrefix, logger, {
      resolution: prefs.display?.resolution?.value
    });
    setMainWindow(window);

    // 设置 MessageBus 订阅
    messageBusSubscriber = setupMessageBus(window, logger, () => mainPreferenceManager);
  } catch (error) {
    logger?.logError('Failed to start application', error as Error);
    app.quit();
  }
}

// Electron lifecycle
app.on('ready', main);

app.on('window-all-closed', () => {
  // Stop the backend server when the window is closed
  if (stopServer) {
    stopServer();
  }
  if (stopMobileServer) {
    stopMobileServer();
  }
  if (messageBusSubscriber) {
    messageBusSubscriber.dispose();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (getMainWindow() === null) {
    main();
  }
});
