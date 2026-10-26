const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { Settings } = require('../electron/settings.cjs'); const { Store } = require('../electron/store.cjs');
test('appearance and account metadata persist without replacing account IDs or credentials', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-prefs-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const settings = new Settings(root); settings.update({ theme: 'light', reduceTransparency: true });
  assert.deepEqual(new Settings(root).value, { theme: 'light', reduceTransparency: true });
  assert.throws(() => settings.update({ theme: 'unsafe' }));
  const store = new Store(root); const a = store.add('codex', 'Antes');
  fs.writeFileSync(path.join(store.directory(a.id), 'credential-test'), 'unchanged');
  store.update(a.id, { favorite: true, label: 'Depois', id: 'not-allowed', provider: 'claude' });
  const saved = new Store(root).get(a.id);
  assert.equal(saved.label, 'Depois'); assert.equal(saved.favorite, true); assert.equal(saved.provider, 'codex');
  assert.equal(fs.readFileSync(path.join(store.directory(a.id), 'credential-test'), 'utf8'), 'unchanged');
});
