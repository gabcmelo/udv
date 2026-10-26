const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { Store } = require('../electron/store.cjs');
const { profileEnv } = require('../electron/process.cjs');
test('multiple accounts of the same provider persist independently; path traversal is refused', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-store-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new Store(root); const first = store.add('codex', 'Pessoal'); const second = store.add('codex', 'Trabalho');
  assert.notEqual(store.directory(first.id), store.directory(second.id));
  assert.equal(new Store(root).accounts.length, 2);
  assert.throws(() => store.directory('../../outside'));
  assert.throws(() => store.add('other', 'Unsupported'));
  fs.writeFileSync(path.join(store.directory(second.id), 'keep'), 'keep');
  store.remove(first.id); assert.equal(fs.existsSync(path.join(store.directory(second.id), 'keep')), true);
});
test('profile environments remove inherited provider credentials', () => {
  const old = process.env.ANTHROPIC_API_KEY; process.env.ANTHROPIC_API_KEY = 'test-only-secret';
  try { const env = profileEnv('claude', '/isolated'); assert.equal(env.ANTHROPIC_API_KEY, undefined); assert.equal(env.CLAUDE_CONFIG_DIR, '/isolated'); assert.equal(env.CODEX_HOME, undefined); }
  finally { if (old === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = old; }
});
test('Claude bridge persists only usage, never transcripts or credentials; missing windows do not overwrite last reading', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-bridge-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bridge = path.resolve(__dirname, '../electron/claude-bridge.cjs');
  const options = { env: { ...process.env, CLAUDE_CONFIG_DIR: root }, encoding: 'utf8' };
  const result = spawnSync(process.execPath, [bridge], { ...options, input: JSON.stringify({ access_token: 'secret', transcript_path: '/secret', rate_limits: { five_hour: { used_percentage: 23, resets_at: Date.now() / 1000 + 300 } } }) });
  assert.equal(result.status, 0); const stored = fs.readFileSync(path.join(root, 'udv-usage.json'), 'utf8');
  assert.equal(stored.includes('secret'), false); assert.equal(JSON.parse(stored).windows[0].usedPercent, 23);
  spawnSync(process.execPath, [bridge], { ...options, input: '{}' });
  assert.equal(fs.readFileSync(path.join(root, 'udv-usage.json'), 'utf8'), stored);
});
