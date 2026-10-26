const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
async function windowInfo(app) { return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => ({ role: new URL(w.webContents.getURL()).searchParams.get('view'), visible: w.isVisible(), bounds: w.getBounds() }))); }
async function trayClick(app) { await app.evaluate(({ app }) => app.emit('udv:test-tray-click')); }
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-desktop-'));
  const env = { ...process.env, UDV_TEST_USER_DATA_DIR: profile }; delete env.ELECTRON_RUN_AS_NODE;
  let app; const errors = [];
  try {
    app = await electron.launch({ args: [root], env });
    const popup = await app.firstWindow(); popup.on('pageerror', e => errors.push(e.message));
    assert.equal(await app.evaluate(({ app }) => app.getName()), 'UDV');
    await expect(popup).toHaveTitle('UDV · Resumo');
    await expect(popup.locator('.popup .empty-state h2')).toHaveText('Nenhuma conta conectada');
    const initial = (await windowInfo(app)).find(w => w.role === 'popup');
    assert.equal(initial.bounds.width, 380); assert.ok(initial.bounds.height <= 560);
    // The primary Add action opens the management window, including on its first load.
    const nextWindow = app.waitForEvent('window');
    await popup.locator('.popup-footer').getByRole('button', { name: 'Adicionar conta' }).click();
    const panel = await nextWindow; panel.on('pageerror', e => errors.push(e.message));
    await expect(panel).toHaveTitle('UDV · Contas');
    await expect(panel.getByRole('heading', { name: 'UDV', exact: true })).toBeVisible();
    await expect(panel.getByRole('dialog')).toBeVisible();
    await panel.getByRole('dialog').getByRole('button', { name: 'Codex', exact: true }).click();
    await panel.getByPlaceholder('Ex.: Pessoal ou Trabalho').fill('Conta teste');
    await expect(panel.getByRole('button', { name: 'Adicionar e conectar' })).toBeEnabled();
    await panel.keyboard.press('Escape');
    await panel.getByRole('button', { name: 'Explorar com dados de exemplo' }).click();
    await expect(panel.locator('.account-row')).toHaveCount(4);
    // A ring measures CONSUMED quota; its legend must also preserve the remaining quota.
    const firstMeter = panel.getByRole('meter').first();
    await expect(firstMeter).toHaveAttribute('aria-valuenow', '38');
    await expect(firstMeter).toHaveAttribute('aria-label', /38% usado, 62% restante/);
    await expect(panel.locator('.usage-rings')).toHaveCount(4);
    const fraction = await panel.locator('.ring-fill').first().evaluate(circle => {
      const [filled, circumference] = circle.getAttribute('stroke-dasharray').split(' ').map(Number);
      return filled / circumference;
    });
    assert.ok(Math.abs(fraction - .38) < .0001);
    const tones = await panel.locator('.ring-fill').evaluateAll(rings => rings.map(el => getComputedStyle(el).stroke));
    assert.notEqual(tones[0], tones[2]); // Claude and Codex have distinct company palettes.
    await panel.locator('.filter-tabs').getByRole('button', { name: /^Claude/ }).click();
    await expect(panel.locator('.account-row')).toHaveCount(2);
    await panel.locator('.filter-tabs').getByRole('button', { name: /^Todas/ }).click();
    await panel.getByRole('textbox', { name: 'Buscar conta' }).fill('Não existe');
    await expect(panel.getByRole('heading', { name: 'Nenhuma conta encontrada' })).toBeVisible();
    await panel.getByRole('button', { name: 'Limpar filtros' }).click();
    await panel.getByRole('button', { name: 'Aparência e ajuda' }).click();
    await panel.getByLabel('Tema', { exact: true }).selectOption('light');
    await expect(panel.locator('.surface')).toHaveClass(/light/);
    await panel.getByLabel('Reduzir transparência', { exact: true }).click();
    await expect(panel.getByLabel('Reduzir transparência', { exact: true })).toBeChecked();
    await expect.poll(() => panel.evaluate(async () => (await window.udv.ui()).material)).toBe('solid');
    await panel.getByLabel('Reduzir transparência', { exact: true }).click();
    await expect(panel.getByLabel('Reduzir transparência', { exact: true })).not.toBeChecked();
    await panel.getByLabel('Tema', { exact: true }).selectOption('dark');
    await panel.getByRole('button', { name: 'Aparência e ajuda' }).click();
    await panel.getByRole('button', { name: 'Abrir resumo' }).click();
    await expect(popup.locator('.account-row')).toHaveCount(4);
    await expect(popup.locator('.rings-chart')).toHaveCount(4);
    await expect(popup.getByRole('meter').first()).toHaveAttribute('aria-valuenow', '38');
    await expect(popup.locator('.demo-banner')).toBeVisible();
    await popup.locator('.account-head').first().click();
    await expect(popup.locator('.account-detail')).toContainText('pessoal@exemplo.com');
    await popup.locator('.account-head').first().click();
    await popup.getByRole('button', { name: 'Fixar resumo aberto' }).click();
    await panel.bringToFront();
    assert.equal((await windowInfo(app)).find(w => w.role === 'popup').visible, true);
    await popup.bringToFront();
    await popup.getByRole('button', { name: 'Desafixar resumo' }).click();
    // Confirm arrow keys and Escape without relying on the operating system tray hit target.
    await popup.locator('.account-head').first().focus(); await popup.keyboard.press('ArrowDown');
    await expect(popup.locator('.account-head').nth(1)).toBeFocused();
    const output = path.join(root, 'test-results'); fs.mkdirSync(output, { recursive: true });
    await popup.screenshot({ path: path.join(output, 'popup-implemented.png') });
    const size = (await windowInfo(app)).find(w => w.role === 'popup').bounds;
    assert.equal(size.width, 380); assert.ok(size.height <= 560);
    assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await popup.keyboard.press('Escape');
    await expect.poll(async () => (await windowInfo(app)).find(w => w.role === 'popup').visible).toBe(false);
    await trayClick(app);
    await expect.poll(async () => (await windowInfo(app)).find(w => w.role === 'popup').visible).toBe(true);
    await popup.getByRole('button', { name: 'Sair da demonstração' }).click();
    await expect(popup.locator('.account-row')).toHaveCount(0);
    await popup.getByRole('button', { name: 'Abrir painel' }).click();
    await expect(panel.locator('.account-row')).toHaveCount(0);
    // Register profiles without starting authentication; verify cross-window updates.
    const ids = await panel.evaluate(async () => {
      const a = await window.udv.add('codex', 'Pessoal teste'); const b = await window.udv.add('codex', 'Trabalho teste');
      await window.udv.update(b.id, { favorite: true, label: 'Trabalho renomeado' }); return [a.id, b.id];
    });
    assert.notEqual(ids[0], ids[1]);
    await expect(panel.locator('.account-row')).toHaveCount(2);
    await panel.getByRole('button', { name: 'Abrir resumo' }).click();
    await expect(popup.locator('.account-row')).toHaveCount(2);
    await expect(popup.getByRole('meter')).toHaveCount(0); // Disconnected accounts cannot show invented quota.
    await expect(popup.locator('.account-head').first()).toContainText('Trabalho renomeado');
    await panel.bringToFront();
    await expect.poll(async () => (await windowInfo(app)).find(w => w.role === 'popup').visible).toBe(false);
    const persisted = JSON.parse(fs.readFileSync(path.join(profile, 'accounts.json'), 'utf8'));
    assert.equal(persisted.find(a => a.id === ids[1]).favorite, true);
    assert.equal(JSON.parse(fs.readFileSync(path.join(profile, 'preferences.json'), 'utf8')).theme, 'dark');
    assert.deepEqual(errors, []);
    console.log('PASS: Electron real: bandeja, resumo 380px, foco/teclado, fixar/blur, painel, cadastro, filtros, favoritos, aparência, material sólido e atualização entre janelas. Nenhum login iniciado.');
  } catch (error) {
    if (app) for (const page of app.windows()) {
      const role = new URL(page.url()).searchParams.get('view');
      fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'test-results', `failure-${role}.png`) }).catch(() => {});
      console.error(role + ': ' + (await page.locator('body').innerText().catch(() => '')).slice(0, 1800));
    }
    throw error;
  } finally {
    if (app) await app.close(); await new Promise(resolve => setTimeout(resolve, 500));
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
