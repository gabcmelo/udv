// Provider query only; credentials remain inside the official CLI.
const path = require('node:path'); const assert = require('node:assert/strict');
const { Store } = require('../electron/store.cjs'); const { Providers } = require('../electron/providers.cjs');
(async () => {
  const store = new Store(require('../electron/data-directory.cjs').dataDirectory(process.env.APPDATA));
  const account = store.accounts.find(a => a.provider === 'claude');
  if (!account) throw new Error('Nenhuma conta Claude cadastrada.');
  const providers = new Providers(store, () => { throw new Error('Este teste não inicia login.'); }, () => {});
  try {
    await providers.refresh(account, { manual: true });
    const reading = providers.view(account);
    assert.equal(reading.status, 'connected'); assert.ok(reading.windows.length); assert.ok(reading.updatedAt);
    assert.equal(reading.error, null);
    console.log(JSON.stringify({ status: reading.status, source: reading.usageSource, updatedAt: new Date(reading.updatedAt).toISOString(),
      windows: reading.windows.map(({ label, usedPercent, resetsAt }) => ({ label, usedPercent, resetsAt })),
      nextAutomaticQueryAt: new Date(reading.nextQueryAt).toISOString(), note: 'Consulta /usage validada com zero inferência; nenhum prompt de conversa enviado.' }, null, 2));
  } finally { providers.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
