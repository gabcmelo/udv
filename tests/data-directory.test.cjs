const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { dataDirectory } = require('../electron/data-directory.cjs');

test('UDV keeps legacy account and profile paths without moving data', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-data-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(dataDirectory(root), path.join(root, 'usage-dash-view'));
  assert.equal(dataDirectory(root, true), path.join(root, 'Usage Dash View'));
  const renamed = path.join(root, 'Lumebar');
  fs.mkdirSync(renamed);
  fs.writeFileSync(path.join(renamed, 'accounts.json'), '[]');
  assert.equal(dataDirectory(root), renamed);
  assert.equal(dataDirectory(root, true), renamed);
  const development = path.join(root, 'usage-dash-view');
  fs.mkdirSync(path.join(development, 'profiles'), { recursive: true });
  fs.writeFileSync(path.join(development, 'accounts.json'), '[]');
  assert.equal(dataDirectory(root), development);
  assert.equal(dataDirectory(root, true), development);
  const packaged = path.join(root, 'Usage Dash View');
  fs.mkdirSync(packaged);
  fs.writeFileSync(path.join(packaged, 'preferences.json'), '{}');
  assert.equal(dataDirectory(root, true), packaged);
  assert.equal(dataDirectory(root, false), development);
  assert.equal(fs.readFileSync(path.join(development, 'accounts.json'), 'utf8'), '[]');
});
