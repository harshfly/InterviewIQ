/**
 * InterviewIQ Desktop — Electron Main Process
 *
 * Core features:
 * - Content protection (SetWindowDisplayAffinity)
 * - System tray
 * - Global hotkeys
 * - No taskbar icon
 * - Always on top overlay window
 * - Single instance lock
 */

const {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  screen,
} = require('electron');
const path = require('path');
const Store = require('electron-store');

// ── Single Instance Lock ──
app.commandLine.appendSwitch('disable-gpu-sandbox'); // Prevent GPU crashes without hiding windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

const store = new Store({
  defaults: {
    backendUrl: 'http://localhost:8000',
    overlayBounds: null,
    contentProtection: true,
    alwaysOnTop: true,
  },
});

let mainWindow = null;
let overlayWindow = null;
let tray = null;

// ── Main Window (Setup / Settings) ──
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    frame: true,
    backgroundColor: '#07070a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: true,
  });

  // Load the web app
  const webUrl = store.get('backendUrl', 'http://localhost:5173');
  mainWindow.loadURL(webUrl.replace(':8000', ':5173'));

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Main window failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// ── Overlay Window (Always-on-top, content-protected) ──
function createOverlayWindow() {
  const savedBounds = store.get('overlayBounds');
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: savedBounds?.width || 480,
    height: savedBounds?.height || 400,
    x: savedBounds?.x || screenW - 520,
    y: savedBounds?.y || 60,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: true,
  });

  // ═══════════════════════════════════════════════════════
  // CRITICAL: Content Protection
  // This makes the overlay invisible to screen capture,
  // Zoom, Teams, Meet, OBS, Snipping Tool, Game Bar, etc.
  // ═══════════════════════════════════════════════════════
  if (store.get('contentProtection', true)) {
    overlayWindow.setContentProtection(true);
  }

  // Don't steal focus
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  // Load overlay page
  const webUrl = store.get('backendUrl', 'http://localhost:5173');
  overlayWindow.loadURL(`${webUrl.replace(':8000', ':5173')}#overlay`);

  // Re-apply content protection on show (critical!)
  overlayWindow.on('show', () => {
    if (store.get('contentProtection', true)) {
      overlayWindow.setContentProtection(true);
    }
  });

  overlayWindow.on('restore', () => {
    if (store.get('contentProtection', true)) {
      overlayWindow.setContentProtection(true);
    }
  });

  // Save position on move/resize
  overlayWindow.on('moved', () => {
    store.set('overlayBounds', overlayWindow.getBounds());
  });

  overlayWindow.on('resized', () => {
    store.set('overlayBounds', overlayWindow.getBounds());
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

// ── System Tray ──
function createTray() {
  // Create a simple icon (16x16 blue square)
  const icon = nativeImage.createFromBuffer(
    Buffer.alloc(16 * 16 * 4, 0), // Placeholder — replace with real icon
    { width: 16, height: 16 }
  );

  tray = new Tray(icon);
  tray.setToolTip('InterviewIQ — AI Interview Copilot');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide Overlay',
      click: () => toggleOverlay(),
    },
    {
      label: 'Show Main Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Content Protection',
      type: 'checkbox',
      checked: store.get('contentProtection', true),
      click: (menuItem) => {
        store.set('contentProtection', menuItem.checked);
        if (overlayWindow) {
          overlayWindow.setContentProtection(menuItem.checked);
        }
      },
    },
    {
      label: 'Always On Top',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        if (overlayWindow) {
          overlayWindow.setAlwaysOnTop(menuItem.checked, 'screen-saver');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => toggleOverlay());
}

// ── Toggle Overlay Visibility ──
function toggleOverlay() {
  if (!overlayWindow) {
    createOverlayWindow();
    return;
  }

  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
  } else {
    overlayWindow.show();
    // Re-apply protection
    if (store.get('contentProtection', true)) {
      overlayWindow.setContentProtection(true);
    }
  }
}

// ── Global Hotkeys ──
function registerHotkeys() {
  // Toggle overlay
  globalShortcut.register('Ctrl+Shift+H', () => {
    toggleOverlay();
  });

  // Regenerate answer
  globalShortcut.register('Ctrl+Shift+R', () => {
    if (overlayWindow) {
      overlayWindow.webContents.send('hotkey', 'regenerate');
    }
  });

  // Pause/resume
  globalShortcut.register('Ctrl+Shift+P', () => {
    if (overlayWindow) {
      overlayWindow.webContents.send('hotkey', 'pause');
    }
  });
}

// ── IPC Handlers ──
ipcMain.handle('get-settings', () => store.store);
ipcMain.handle('set-setting', (_, key, value) => store.set(key, value));
ipcMain.handle('toggle-content-protection', (_, enabled) => {
  store.set('contentProtection', enabled);
  if (overlayWindow) {
    overlayWindow.setContentProtection(enabled);
  }
});

// ── App Lifecycle ──
app.whenReady().then(() => {
  console.log('[InterviewIQ] App is ready, creating main window...');
  createMainWindow();
  console.log('[InterviewIQ] Main window created');
  createOverlayWindow();
  console.log('[InterviewIQ] Overlay window created');
  createTray();
  registerHotkeys();
  console.log('[InterviewIQ] All windows launched successfully');
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  // Don't quit on all windows closed — keep tray alive
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (!mainWindow) {
    createMainWindow();
  }
});
