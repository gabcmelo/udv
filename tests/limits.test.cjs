const { test } = require('node:test');
const assert = require('node:assert/strict');
const { codexLimits, claudeLimits } = require('../electron/limits.cjs');
test('Codex keeps multiple metered buckets and actual window lengths without duplicating the legacy bucket', () => {
  const windows = codexLimits({ rateLimits: { primary: { usedPercent: 99 } }, rateLimitsByLimitId: {
    codex: { primary: { usedPercent: 0, windowDurationMins: 300, resetsAt: 2000 }, secondary: { usedPercent: 71, windowDurationMins: 10080, resetsAt: 3000 } },
    review: { limitName: 'Code review', primary: { usedPercent: 10, windowDurationMins: 60 } }
  } }, 1000000);
  assert.equal(windows.length, 3); assert.equal(windows[0].usedPercent, 0);
  assert.equal(windows[1].label, 'Semanal'); assert.equal(windows[2].label, 'Code review · Janela de 1 horas');
  assert.equal(windows[0].resetsAt, 2000000);
});
test('missing usage is unknown; expired readings are not reported as fresh zero usage', () => {
  assert.deepEqual(codexLimits({}), []);
  assert.deepEqual(claudeLimits({ rate_limits: { five_hour: { used_percentage: null } } }), []);
  const [window] = claudeLimits({ rate_limits: { five_hour: { used_percentage: 92, resets_at: 1 } } }, 2000);
  assert.equal(window.expired, true); assert.equal(window.usedPercent, 92);
});
test('Claude windows may be independently absent; invalid numeric readings are rejected', () => {
  const windows = claudeLimits({ rate_limits: { seven_day: { used_percentage: 41, resets_at: 2000 }, five_hour: { used_percentage: NaN } } });
  assert.equal(windows.length, 1); assert.equal(windows[0].id, 'seven_day');
});
