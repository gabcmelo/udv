const { test } = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const { ClaudeUsage, parseUsage, parseReset } = require('../electron/claude-usage.cjs');
const now = Date.parse('2026-10-26T16:00:00Z');
const response = () => ({ num_turns: 0, duration_api_ms: 0, total_cost_usd: 0, usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, modelUsage: {},
  result: 'You are currently using your subscription\nCurrent session: 0% used · resets Oct 26, 6:09pm (America/Sao_Paulo)\nCurrent week (all models): 41% used · resets Oct 29, 4:59pm (America/Sao_Paulo)\nCurrent week (Fable): 6% used · resets Oct 29, 4:59pm (America/Sao_Paulo)' });
function temp(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-query-test-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root; }
test('parses real local /usage output, including model-specific windows and reset timezone', () => {
  const windows = parseUsage(response(), now);
  assert.equal(windows.length, 3); assert.equal(windows[0].usedPercent, 0); assert.equal(windows[1].usedPercent, 41);
  assert.equal(windows[0].resetsAt, Date.parse('2026-10-26T21:09:00Z')); assert.equal(windows[2].label, 'Semanal · Fable');
});
test('reset parsing supports date variants and year rollover, but never guesses an invalid timezone', () => {
  assert.equal(parseReset('Oct 26 at 6:09pm', 'America/Sao_Paulo', now), Date.parse('2026-10-26T21:09:00Z'));
  assert.equal(parseReset('Jan 1, 12am', 'America/Sao_Paulo', Date.parse('2026-12-31T16:00:00Z')), Date.parse('2027-01-01T03:00:00Z'));
  assert.equal(parseReset('Oct 26, 6pm', 'Invalid/Timezone', now), null);
});
test('never treats model output or provider last-known bars as a fresh reading', () => {
  assert.throws(() => parseUsage({ ...response(), num_turns: 1 }), { code: 'INCOMPATIBLE' });
  assert.throws(() => parseUsage({ ...response(), usage: { output_tokens: 1 } }), { code: 'INCOMPATIBLE' });
  assert.throws(() => parseUsage({ ...response(), result: 'Showing last-known usage\n' + response().result }), { code: 'RATE_LIMIT' });
  assert.throws(() => parseUsage({ ...response(), result: 'No limits were supplied' }), { code: 'NO_LIMITS' });
});
test('first automatic read queries /usage with no conversation, hooks or MCP; cooldown survives app restart', async t => {
  const root = temp(t); let calls = 0;
  const run = async (_file, args, options) => {
    calls++; assert.equal(args[args.indexOf('-p') + 1], '/usage');
    assert.equal(args[args.indexOf('--tools') + 1], ''); assert.ok(args.includes('--restricted')); assert.ok(args.includes('--strict-mcp-config')); assert.ok(args.includes('--no-session-persistence'));
    assert.equal(options.env.CLAUDE_CONFIG_DIR, root); return response();
  };
  const make = () => new ClaudeUsage({ run, executable: () => 'claude', now: () => now });
  const first = await make().read(root); assert.equal(first.windows[1].usedPercent, 41); assert.equal(calls, 1);
  const second = await make().read(root); assert.equal(second.updatedAt, first.updatedAt); assert.equal(calls, 1);
  assert.equal(fs.readFileSync(path.join(root, 'udv-query.json'), 'utf8').includes('subscription'), false);
});
test('manual refresh can query after one minute, but repeated clicks and rate-limit backoff cannot hammer the CLI', async t => {
  const root = temp(t); let clock = now, calls = 0;
  const query = new ClaudeUsage({ run: async () => { calls++; if (calls > 1) return { ...response(), result: 'Usage endpoint rate limited until later' }; return response(); }, executable: () => 'claude', now: () => clock });
  await query.read(root); await query.read(root, { manual: true }); assert.equal(calls, 1);
  clock += 61000; const failure = await query.read(root, { manual: true }); assert.equal(calls, 2); assert.equal(failure.updatedAt, now); assert.match(failure.error, /intervalo entre consultas/);
  clock += 61000; await query.read(root, { manual: true }); assert.equal(calls, 2);
});
test('a newer status-line snapshot wins without falsifying the query timestamp', async t => {
  const root = temp(t); const query = new ClaudeUsage({ run: async () => response(), executable: () => 'claude', now: () => now });
  await query.read(root);
  fs.writeFileSync(path.join(root, 'udv-usage.json'), JSON.stringify({ updatedAt: now + 1000, windows: [{ id: 'five_hour', label: '5 h', usedPercent: 7, resetsAt: now + 100000, durationMinutes: 300, expired: false }] }));
  const latest = await query.read(root); assert.equal(latest.windows[0].usedPercent, 7); assert.equal(latest.updatedAt, now + 1000); assert.equal(latest.source, 'statusline');
});
