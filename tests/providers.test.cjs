const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../electron/store.cjs');
const { Providers } = require('../electron/providers.cjs');
test('accounts that never logged in can be removed without an installed CLI or provider network', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-remove-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new Store(root); const providers = new Providers(store, () => {}, () => {});
  for (const provider of ['claude', 'codex']) {
    const account = store.add(provider, 'Não conectada');
    await providers.remove(account); assert.equal(fs.existsSync(store.directory(account.id)), false);
  }
  assert.equal(store.accounts.length, 0);
});
test('a crashed CLI cannot leave the global login lock stuck after cancellation', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-cancel-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new Store(root); const providers = new Providers(store, () => {}, () => {});
  const account = store.add('codex', 'Conta');
  providers.login = { accountId: account.id, loginId: 'test-login' };
  providers.clients.set(account.id, { request: async () => { throw new Error('closed'); } });
  await assert.rejects(providers.cancel(account), /closed/);
  assert.equal(providers.login, null); assert.equal(providers.view(account).status, 'disconnected');
});
