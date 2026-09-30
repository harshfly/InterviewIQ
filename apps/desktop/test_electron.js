const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  console.log('[TEST] Creating simple window...');
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
  });
  win.loadURL('data:text/html,<html><body style="background:#1a1a2e;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:48px"><h1>InterviewIQ Works!</h1></body></html>');
  win.once('ready-to-show', () => {
    console.log('[TEST] Window ready-to-show fired');
    win.show();
    win.focus();
  });
  console.log('[TEST] Window created, waiting for render...');
});

app.on('window-all-closed', () => app.quit());
