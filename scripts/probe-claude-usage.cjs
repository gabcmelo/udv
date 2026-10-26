// Explicit /usage only. Never substitute a conversation prompt or inspect credentials.
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { executable, profileEnv, run } = require('../electron/process.cjs');
(async () => {
  const accountRoot = require('../electron/data-directory.cjs').dataDirectory(process.env.APPDATA);
  const accounts = JSON.parse(fs.readFileSync(path.join(accountRoot, 'accounts.json'), 'utf8'));
  const account = accounts.find(a => a.provider === 'claude');
  if (!account) throw new Error('Nenhuma conta Claude cadastrada.');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-usage-probe-'));
  const emptyMcp = path.join(cwd, 'mcp.json'); fs.writeFileSync(emptyMcp, '{"mcpServers":{}}');
  try {
    const result = await run(executable('claude'), ['-p', '/usage', '--output-format', 'json', '--max-turns', '1', '--restricted', '--strict-mcp-config', '--mcp-config', emptyMcp, '--no-session-persistence', '--tools', '', '--settings', '{"disableAllHooks":true,"language":"English"}'],
      { cwd, env: profileEnv('claude', path.join(accountRoot, 'profiles', account.id)), timeout: 35000 });
    const text = typeof result.result === 'string' ? result.result : '';
    console.log(JSON.stringify({ keys: Object.keys(result), turns: result.num_turns, usage: result.usage, cost: result.total_cost_usd,
      result: text.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '<REDACTED_EMAIL>').replace(/(?:sk-|Bearer\s+)[A-Za-z0-9._-]+/g, '<REDACTED_TOKEN>').slice(0, 3500) }, null, 2));
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
