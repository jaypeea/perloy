const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setName('Perloy');
app.setPath('userData', path.join(app.getPath('appData'), 'Perloy'));

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: '#f6f9fc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    window.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173');
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
