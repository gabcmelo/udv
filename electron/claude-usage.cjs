const fs = require('node:fs'); const path = require('node:path');
const { executable, profileEnv, run } = require('./process.cjs');
const INTERVAL = 20 * 60000;
const MIN_MANUAL = 60000;
function failure(message, code) { const error = new Error(message); error.code = code; return error; }
function parseReset(text, timezone, now = Date.now()) {
  if (typeof timezone !== 'string') return null;
  const clean = text.trim().replace(/\s+at\s+/i, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ');
  const match = clean.match(/^([a-z]{3}) (\d{1,2}) (\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(match[1].toLowerCase());
  const day = Number(match[2]), minute = Number(match[4] || 0), meridiem = match[5]?.toLowerCase();
  let hour = Number(match[3]);
  if (month < 0 || day < 1 || day > 31 || minute > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (meridiem) hour = hour % 12 + (meridiem === 'pm' ? 12 : 0);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
    const parts = timestamp => Object.fromEntries(formatter.formatToParts(timestamp).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    const current = parts(now); let year = current.year;
    if (current.month === 12 && month === 0) year++;
    if (current.month === 1 && month === 11) year--;
    const target = Date.UTC(year, month, day, hour, minute); let guess = target;
    for (let i = 0; i < 4; i++) { const p = parts(guess); guess += target - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second); }
    const p = parts(guess);
    return p.year === year && p.month === month + 1 && p.day === day && p.hour === hour && p.minute === minute ? guess : null;
  } catch { return null; }
}
function parseUsage(response, now = Date.now()) {
  // A command response must prove there was no inference. Never accept generated text as a quota.
  const usage = response?.usage || {};
  if (response?.num_turns !== 0 || response.duration_api_ms !== 0 || (response.total_cost_usd || 0) !== 0
    || ['input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens'].some(key => (usage[key] || 0) !== 0)
    || Object.keys(response.modelUsage || {}).length) throw failure('Esta versão do Claude Code não retornou os limites no formato esperado. Atualize o Claude Code e tente de novo.', 'INCOMPATIBLE');
  const text = typeof response.result === 'string' ? response.result : '';
  if (/rate[- ]limited|too many requests|showing last.known|\b429\b/i.test(text)) throw failure('O Claude pediu um intervalo entre consultas. A última leitura continua aqui. Vamos tentar de novo automaticamente.', 'RATE_LIMIT');
  if (response.is_error) throw failure('Não foi possível consultar os limites pelo Claude Code. Verifique o login dessa conta.', 'CLI_ERROR');
  const windows = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^Current (session|week \(([^)]+)\)):\s*(\d+(?:\.\d+)?)%\s*used(?:\s*[·•]\s*resets\s+(.+?)\s*\(([^)]+)\))?\s*$/i);
    if (!match) continue;
    const used = Number(match[3]); if (!Number.isFinite(used) || used < 0 || used > 100) continue;
    const session = match[1].toLowerCase() === 'session';
    const model = session || match[2].toLowerCase() === 'all models' ? null : match[2].slice(0, 70);
    const resetsAt = match[4] ? parseReset(match[4], match[5], now) : null;
    windows.push({ id: session ? 'five_hour' : model ? 'seven_day_' + model.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'seven_day',
      label: session ? 'Janela de 5 horas' : model ? `Semanal · ${model}` : 'Semanal', usedPercent: used,
      resetsAt, durationMinutes: session ? 300 : 10080, expired: resetsAt !== null && resetsAt <= now });
  }
  if (!windows.length) throw failure('O Claude Code não informou os limites desta conta. Confira o plano conectado e se o Claude Code está atualizado.', 'NO_LIMITS');
  return windows;
}
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function snapshot(value, source) {
  if (!value || !Number.isFinite(value.updatedAt) || !Array.isArray(value.windows) || !value.windows.length) return null;
  if (value.windows.some(w => !w || typeof w.id !== 'string' || typeof w.label !== 'string' || !Number.isFinite(w.usedPercent) || w.usedPercent < 0 || w.usedPercent > 100 || (w.resetsAt !== null && !Number.isFinite(w.resetsAt)))) return null;
  return { updatedAt: value.updatedAt, windows: value.windows, source };
}
class ClaudeUsage {
  constructor(dependencies = {}) {
    this.run = dependencies.run || run; this.executable = dependencies.executable || executable; this.now = dependencies.now || Date.now;
    this.inflight = new Map();
  }
  read(directory, options = {}) {
    if (this.inflight.has(directory)) return this.inflight.get(directory);
    const task = this.query(directory, options).finally(() => this.inflight.delete(directory));
    this.inflight.set(directory, task); return task;
  }
  async query(directory, { manual = false } = {}) {
    const cacheFile = path.join(directory, 'udv-query.json');
    const previous = readJson(cacheFile) || {};
    const now = this.now(); let state = previous;
    const blocked = now < (previous.blockedUntil || 0);
    const manualDue = manual && now - (previous.lastAttemptAt || 0) >= MIN_MANUAL;
    const automaticDue = now >= (previous.nextQueryAt || 0);
    if (!blocked && (manualDue || automaticDue)) {
      const privateCwd = path.join(directory, 'udv-monitor');
      fs.mkdirSync(privateCwd, { recursive: true, mode: 0o700 });
      const mcp = path.join(privateCwd, 'empty-mcp.json'); fs.writeFileSync(mcp, '{"mcpServers":{}}', { mode: 0o600 });
      state = { ...previous, lastAttemptAt: now, nextQueryAt: now + INTERVAL };
      try {
        const response = await this.run(this.executable('claude'), ['-p', '/usage', '--output-format', 'json', '--max-turns', '1',
          '--restricted', '--strict-mcp-config', '--mcp-config', mcp, '--no-session-persistence', '--tools', '',
          '--permission-mode', 'dontAsk', '--settings', '{"disableAllHooks":true,"language":"English"}'],
          { cwd: privateCwd, env: profileEnv('claude', directory), timeout: 35000 });
        const windows = parseUsage(response, this.now());
        state = { ...state, snapshot: { windows, updatedAt: this.now() }, error: null, failures: 0, blockedUntil: 0 };
      } catch (error) {
        const failures = Math.min((previous.failures || 0) + 1, 4);
        const rateLimited = error.code === 'RATE_LIMIT';
        const incompatible = error.code === 'INCOMPATIBLE';
        state = { ...state, failures, error: error.code ? error.message : 'Não conseguimos atualizar os limites do Claude. Mantivemos a última leitura e vamos tentar de novo automaticamente.',
          blockedUntil: rateLimited || incompatible ? now + Math.min(INTERVAL * 2 ** (failures - 1), 60 * 60000) : now + MIN_MANUAL };
        state.nextQueryAt = Math.max(state.nextQueryAt, state.blockedUntil);
      }
      // Store only normalized readings and our own fixed diagnostics. No CLI response, tokens or transcript.
      const temp = `${cacheFile}.${process.pid}.tmp`;
      fs.writeFileSync(temp, JSON.stringify(state), { mode: 0o600 }); fs.renameSync(temp, cacheFile);
    }
    const candidates = [snapshot(readJson(path.join(directory, 'udv-usage.json')), 'statusline'), snapshot(state.snapshot, 'usage')].filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
    const latest = candidates[0] || { windows: [], updatedAt: null, source: 'usage' };
    return { ...latest, error: state.error || null, nextQueryAt: state.nextQueryAt || null,
      windows: latest.windows.map(w => ({ ...w, expired: w.resetsAt !== null && w.resetsAt <= this.now() })) };
  }
}
module.exports = { ClaudeUsage, parseUsage, parseReset };
