/**
 * InterviewIQ Desktop — Preload Script
 * Exposes a safe API to the renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('interviewIQ', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  // Content protection
  toggleContentProtection: (enabled) =>
    ipcRenderer.invoke('toggle-content-protection', enabled),

  // Hotkey events
  onHotkey: (callback) => {
    ipcRenderer.on('hotkey', (_, action) => callback(action));
  },

  // Platform info
  platform: process.platform,
  isDesktop: true,
});
