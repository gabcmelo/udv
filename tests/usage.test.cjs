const { test } = require('node:test');
const assert = require('node:assert/strict');
const { statusOf, summarize, sortAccounts } = require('../shared/usage.cjs');
const now = 10000000;
const account = (id, used = 30, patch = {}) => ({ id, provider: 'codex', label: id, status: 'connected', createdAt: Number(id) || 0, updatedAt: now - 60000, windows: [{ id: '5h', usedPercent: used, resetsAt: now + 100000, expired: false }], ...patch });
test('old or failed readings cannot produce a confirmed exhausted/healthy tray badge', () => {
  const old = account('1', 100, { updatedAt: now - 46 * 60000 });
  assert.equal(statusOf(old, now), 'stale'); assert.equal(summarize([old], now).badge, 'unknown');
  const failed = account('2', 100, { status: 'error' }); assert.equal(summarize([failed], now).badge, 'unknown');
  assert.match(summarize([account('3'), failed], now).text, /sem leitura confirmada/);
});
test('expired windows remain unknown, but a different fresh window can still require action', () => {
  const item = account('1', 100); item.windows[0].resetsAt = now - 1;
  assert.equal(statusOf(item, now), 'expired');
  item.windows.push({ id: 'week', usedPercent: 85, resetsAt: now + 50000, expired: false });
  assert.equal(statusOf(item, now), 'near'); assert.equal(summarize([item], now).badge, 'near');
});
test('favorites stay first, then actionable accounts; input ordering is never mutated', () => {
  const items = [account('1'), account('2', 100), account('3', 30, { favorite: true })];
  assert.deepEqual(sortAccounts(items, now).map(a => a.id), ['3', '2', '1']);
  assert.deepEqual(items.map(a => a.id), ['1', '2', '3']);
  assert.equal(statusOf(account('4', 0, { windows: [] }), now), 'unknown');
});
