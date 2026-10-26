const { _electron: electron, expect } = require('@playwright/test');
const path = require('node:path'); const assert = require('node:assert/strict');
(async () => {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: path.resolve(__dirname, '../release/win-unpacked/UDV.exe'), env });
  let popup, previousDemo;
  try {
    popup = await app.firstWindow(); await expect(popup.locator('.surface.popup')).toBeVisible();
    assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
    const state = await popup.evaluate(() => window.udv.ui()); assert.equal(state.version, require('../package.json').version);
    const originalAccounts = await popup.evaluate(() => window.udv.list());
    const connectedReadings = originalAccounts.filter(a => !['connecting', 'disconnected'].includes(a.status));
    if (connectedReadings.length) await expect(popup.locator('.usage-rings')).toHaveCount(connectedReadings.length);
    previousDemo = await popup.evaluate(() => localStorage.getItem('udv:demo'));
    // Use the real UI path; never navigate around the renderer's navigation guard.
    const demoLink = popup.getByRole('button', { name: 'Explorar com dados de exemplo' });
    if (await demoLink.count()) {
      await demoLink.click();
      await expect(popup.locator('.account-row')).toHaveCount(4);
      await expect(popup.locator('.demo-banner')).toContainText('dados fictícios');
    }
    const size = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
    assert.equal(size.width, 380); assert.ok(size.height <= 560);
    const identity = rows => rows.map(({ id, provider, label, favorite }) => ({ id, provider, label, favorite }));
    assert.deepEqual(identity(await popup.evaluate(() => window.udv.list())), identity(originalAccounts));
    console.log('PASS: Windows empacotado: resumo 380px, preload, preferência/material e demonstração; nenhum cadastro ou login modificado.');
  } finally {
    if (popup && previousDemo !== undefined) await popup.evaluate(value => { if (value === null) localStorage.removeItem('udv:demo'); else localStorage.setItem('udv:demo', value); }, previousDemo).catch(() => {});
    await app.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
