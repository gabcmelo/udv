const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, nativeTheme, screen, shell, dialog } = require('electron');
const path = require('node:path');
const { Store } = require('./store.cjs');
const { Providers } = require('./providers.cjs');
const { Settings } = require('./settings.cjs');
const { createMaterials } = require('./materials.cjs');
const { popupBounds } = require('./popup-bounds.cjs');
const { summarize } = require('../shared/usage.cjs');
const iconDirectory = path.join(__dirname, 'assets');
const appIcon = path.join(iconDirectory, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
const trayIcons = new Map();
let popup, panel, tray, store, providers, settings, materials, interval;
let quitting = false, pinned = false, popupHeight = 250, lastBlur = 0, anchor;
let addRequest = 0;
const materialNames = new WeakMap();
const { dataDirectory } = require('./data-directory.cjs');
app.setName('UDV');
app.setPath('userData', dataDirectory(app.getPath('appData'), app.isPackaged));
// Development smoke tests get a separate lock and data directory before acquiring the lock.
if (!app.isPackaged && process.env.UDV_TEST_USER_DATA_DIR) app.setPath('userData', process.env.UDV_TEST_USER_DATA_DIR);
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
const windows = () => [popup, panel].filter(w => w && !w.isDestroyed());
function broadcast(channel) { windows().forEach(w => w.webContents.send(channel)); }
function uiState(window = popup) {
  return { ...settings.value, dark: nativeTheme.shouldUseDarkColors, reduced: !!materials.reduced(),
    highContrast: !!nativeTheme.shouldUseHighContrastColors, platform: process.platform,
    material: materialNames.get(window) || 'solid', pinned, addRequest: window === panel ? addRequest : 0, version: app.getVersion() };
}
function hidePopup() { pinned = false; popup?.hide(); broadcast('ui:changed'); rebuildMenu(); }
function positionPopup() {
  if (!popup || popup.isDestroyed()) return;
  if (!anchor) {
    const bounds = tray.getBounds(); const point = screen.getCursorScreenPoint();
    anchor = bounds.width > 0 && bounds.height > 0 ? bounds : { ...point, width: 0, height: 0 };
  }
  const display = screen.getDisplayNearestPoint({ x: Math.round(anchor.x + anchor.width / 2), y: Math.round(anchor.y + anchor.height / 2) });
  popup.setBounds(popupBounds(display.workArea, anchor, popupHeight, display.bounds));
}
function showPopup() {
  if (!popup || popup.isDestroyed()) return;
  anchor = null; positionPopup(); popup.show(); popup.focus(); popup.webContents.send('ui:focus');
}
function togglePopup() {
  if (!popup) return;
  if (popup.isVisible()) hidePopup();
  // Tray click can first blur the popup. Do not immediately reopen it on that same click.
  else if (Date.now() - lastBlur > 220) showPopup();
}
function secure(window, role) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && role === 'popup') { event.preventDefault(); hidePopup(); }
  });
  window.webContents.on('did-finish-load', () => {
    materialNames.set(window, materials.apply(window, role)); broadcast('ui:changed');
  });
  const devUrl = !app.isPackaged && process.env.UDV_DEV_URL;
  if (devUrl === 'http://127.0.0.1:5173') window.loadURL(`${devUrl}/?view=${role}`);
  else window.loadFile(path.join(__dirname, '../dist/index.html'), { query: { view: role } });
}
function createPopup(showWhenReady = true) {
  popup = new BrowserWindow({ width: 380, height: popupHeight, show: false, frame: false, resizable: false,
    minimizable: false, maximizable: false, skipTaskbar: true, alwaysOnTop: true, roundedCorners: true,
    transparent: process.platform === 'darwin', backgroundColor: '#00000000', title: 'UDV · Resumo',
    icon: appIcon,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  secure(popup, 'popup');
  popup.on('blur', () => { if (!pinned && popup.isVisible()) { lastBlur = Date.now(); hidePopup(); } });
  popup.on('close', event => { if (!quitting) { event.preventDefault(); hidePopup(); } });
  popup.once('ready-to-show', () => { if (showWhenReady) showPopup(); });
}
function showPanel(options = {}) {
  hidePopup();
  if (options.add) addRequest++;
  if (!panel || panel.isDestroyed()) {
    panel = new BrowserWindow({ width: 940, height: 720, minWidth: 660, minHeight: 500, show: false,
      backgroundColor: '#00000000', autoHideMenuBar: true, title: 'UDV · Contas',
      icon: appIcon,
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    secure(panel, 'panel');
    panel.once('ready-to-show', () => { panel.show(); panel.focus(); broadcast('ui:changed'); });
    panel.on('close', event => { if (!quitting) { event.preventDefault(); panel.hide(); } });
  } else { if (panel.isMinimized()) panel.restore(); panel.show(); panel.focus(); broadcast('ui:changed'); }
}
function trayImage() {
  const tone = process.platform === 'darwin' ? 'template' : nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ? 'light' : 'dark';
  const badge = store ? summarize(store.accounts.map(a => providers.view(a))).badge : 'unknown';
  const key = `${tone}-${badge}`;
  if (!trayIcons.has(key)) {
    const icon = nativeImage.createFromPath(path.join(iconDirectory, `tray-${key}.png`));
    if (icon.isEmpty()) throw new Error(`Ícone da bandeja indisponível: ${key}`);
    if (process.platform === 'darwin') icon.setTemplateImage(true);
    trayIcons.set(key, icon);
  }
  return trayIcons.get(key);
}
function rebuildMenu() {
  if (!tray || !settings) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir resumo', click: showPopup }, { label: 'Abrir painel de contas', click: () => showPanel() },
    { label: 'Atualizar limites', click: () => refreshAll(true) },
    { label: 'Manter resumo aberto', type: 'checkbox', checked: pinned, click: item => { pinned = item.checked; if (pinned) showPopup(); broadcast('ui:changed'); } },
    { type: 'separator' },
    { label: 'Aparência', submenu: [['system', 'Seguir o sistema'], ['light', 'Claro'], ['dark', 'Escuro']].map(([theme, label]) => ({ label, type: 'radio', checked: settings.value.theme === theme, click: () => updateSettings({ theme }) })) },
    { label: 'Reduzir transparência', type: 'checkbox', checked: settings.value.reduceTransparency, click: item => updateSettings({ reduceTransparency: item.checked }) },
    { type: 'separator' }, { label: 'Sair do UDV', click: () => app.quit() }
  ]));
}
function changed() {
  broadcast('accounts:changed');
  if (tray && providers) { tray.setImage(trayImage()); tray.setToolTip(('UDV · ' + summarize(store.accounts.map(a => providers.view(a))).text).slice(0, 127)); }
}
function applyAppearance() {
  if (!materials) return;
  // The optional macOS bridge has no public remove-view method; rebuilding only this
  // transient window releases the native view when accessibility disables transparency.
  if (popup && materials.hasGlass(popup) && materials.reduced()) {
    const old = popup, visible = old.isVisible(); popup = null; old.removeAllListeners('close'); old.removeAllListeners('blur'); old.destroy(); pinned = false; createPopup(visible);
  }
  windows().forEach(w => materialNames.set(w, materials.apply(w, w === popup ? 'popup' : 'panel')));
  broadcast('ui:changed'); rebuildMenu(); changed();
}
function updateSettings(patch) { settings.update(patch); nativeTheme.themeSource = settings.value.theme; applyAppearance(); return uiState(); }
async function refreshAll(manual = false) { if (providers) { await Promise.allSettled(store.accounts.map(a => providers.refresh(a, { manual }))); changed(); } }
if (locked) app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.setIcon(path.join(iconDirectory, 'icon.png'));
  store = new Store(app.getPath('userData')); settings = new Settings(store.root);
  nativeTheme.themeSource = settings.value.theme;
  materials = createMaterials(nativeTheme, settings, app);
  providers = new Providers(store, url => shell.openExternal(url), changed);
  tray = new Tray(trayImage()); tray.setToolTip('UDV · limites por conta'); tray.on('click', togglePopup); rebuildMenu();
  if (!app.isPackaged && process.env.UDV_TEST_USER_DATA_DIR) app.on('udv:test-tray-click', () => tray.emit('click'));
  for (const [channel, handler] of Object.entries({
    'accounts:list': () => store.accounts.map(a => providers.view(a)),
    'accounts:add': (_window, provider, label) => { const a = store.add(provider, label); changed(); return providers.view(a); },
    'accounts:update': (_window, id, patch) => { store.update(id, patch); changed(); },
    'accounts:connect': (_window, id) => providers.connect(store.get(id)),
    'accounts:cancel': (_window, id) => providers.cancel(store.get(id)),
    'accounts:refresh': async (_window, id) => { if (id) await providers.refresh(store.get(id), { manual: true }); else await refreshAll(true); },
    'accounts:claude': (_window, id) => { const a = store.get(id); if (a.provider !== 'claude') throw new Error('Provedor inválido.'); return providers.openClaude(a); },
    'accounts:remove': async (window, id) => {
      const a = store.get(id);
      const { response } = await dialog.showMessageBox(window, { type: 'question', title: 'Remover conta', message: `Desconectar e remover “${a.label}”?`, detail: 'Feche os terminais desta conta antes de continuar. Isso apaga o perfil local e desconecta a conta.', buttons: ['Cancelar', 'Remover conta'], defaultId: 0, cancelId: 0 });
      if (response === 1) await providers.remove(a);
    },
    'ui:read': window => uiState(window),
    'ui:settings': (window, patch) => { updateSettings(patch); return uiState(window); },
    'ui:panel': (_window, options) => showPanel({ add: options?.add === true }),
    'ui:hide': () => hidePopup(),
    'ui:summary': () => showPopup(),
    'ui:pin': (window, value) => { if (window !== popup || typeof value !== 'boolean') return; pinned = value; broadcast('ui:changed'); rebuildMenu(); },
    'ui:height': (window, height) => { if (window === popup && Number.isFinite(height)) { popupHeight = Math.min(560, Math.max(170, height)); positionPopup(); } }
  })) ipcMain.handle(channel, async (event, ...args) => {
    const window = windows().find(w => w.webContents === event.sender);
    if (!window || event.senderFrame !== window.webContents.mainFrame) throw new Error('Origem inválida.');
    return handler(window, ...args);
  });
  createPopup();
  nativeTheme.on('updated', applyAppearance);
  screen.on('display-metrics-changed', () => { anchor = null; positionPopup(); });
  screen.on('display-removed', () => { anchor = null; positionPopup(); });
  interval = setInterval(refreshAll, 60000); refreshAll();
}).catch(error => { dialog.showErrorBox('Não foi possível iniciar o UDV', error.message); app.quit(); });
app.on('second-instance', showPopup); app.on('activate', showPopup);
app.on('before-quit', () => { quitting = true; clearInterval(interval); providers?.close(); });
app.on('window-all-closed', () => {});
module.exports = { showPopup, hidePopup, togglePopup, showPanel, getTray: () => tray };
