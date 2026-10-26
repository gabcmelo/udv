// Standalone design experiment. Does not load the app or any account/provider code.
const { app, BrowserWindow, screen, nativeTheme } = require('electron');
const path = require('node:path');
app.setName('UDV Material Study');
let window;
app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  const area = screen.getPrimaryDisplay().workArea;
  window = new BrowserWindow({ width: 380, height: 480, x: area.x + area.width - 392, y: area.y + area.height - 492,
    frame: false, resizable: false, minimizable: false, maximizable: false, skipTaskbar: false,
    backgroundColor: '#00000000', backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined,
    vibrancy: process.platform === 'darwin' ? 'popover' : undefined, roundedCorners: true,
    title: 'UDV — Estudo Acrylic nativo (dados fictícios)',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(path.join(__dirname, 'tray-prototype.html'), { query: { native: '1' } });
  window.webContents.on('before-input-event', (event, input) => { if (input.key === 'Escape') { event.preventDefault(); window.close(); } });
});
app.on('window-all-closed', () => app.quit());
