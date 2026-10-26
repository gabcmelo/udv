const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { executable, profileEnv, run, RpcClient } = require('./process.cjs');
const { codexLimits } = require('./limits.cjs');
const { ClaudeUsage } = require('./claude-usage.cjs');
const psQuote = text => `'${text.replaceAll("'", "''")}'`;
const shQuote = text => `'${text.replaceAll("'", "'\\''")}'`;
class Providers {
  constructor(store, openExternal, changed) {
    this.store = store; this.openExternal = openExternal; this.changed = changed;
    this.clients = new Map(); this.states = new Map(); this.inflight = new Map(); this.login = null;
    this.claudeUsage = new ClaudeUsage();
  }
  view(account) { return { ...account, status: 'disconnected', windows: [], updatedAt: null, ...this.states.get(account.id) }; }
  update(id, state) { this.states.set(id, { ...this.states.get(id), ...state }); this.changed(); }
  async client(account) {
    let client = this.clients.get(account.id);
    if (client && !client.closed) return client;
    client = new RpcClient(executable('codex'), ['-c', 'cli_auth_credentials_store="file"', 'app-server', '--listen', 'stdio://'],
      { cwd: this.store.directory(account.id), env: profileEnv('codex', this.store.directory(account.id)) },
      (method, params) => {
        if (method === 'account/login/completed') {
          if (this.login?.accountId === account.id) this.login = null;
          this.update(account.id, { status: params.success ? 'connected' : 'error', error: params.success ? null : 'Login não concluído. Tente conectar novamente.' });
          this.refresh(account).catch(() => {});
        }
      });
    this.clients.set(account.id, client);
    try { await client.initialize(); } catch (error) { client.close(); this.clients.delete(account.id); throw error; }
    return client;
  }
  refresh(account, options = {}) {
    if (this.inflight.has(account.id)) return this.inflight.get(account.id);
    const task = this.read(account, options).catch(error => this.update(account.id, { status: 'error', error: error.message }))
      .finally(() => this.inflight.delete(account.id));
    this.inflight.set(account.id, task); return task;
  }
  async read(account, options = {}) {
    if (this.states.get(account.id)?.status === 'connecting') return;
    if (account.provider === 'codex') {
      const client = await this.client(account);
      const { account: identity } = await client.request('account/read', { refreshToken: false });
      if (!identity) return this.update(account.id, { status: 'disconnected', windows: [], error: null });
      if (identity.type !== 'chatgpt') return this.update(account.id, { status: 'error', error: 'Conecte uma assinatura ChatGPT para consultar limites.', windows: [] });
      const result = await client.request('account/rateLimits/read');
      this.update(account.id, { status: 'connected', plan: identity.planType, email: identity.email,
        windows: codexLimits(result), updatedAt: Date.now(), error: null,
        resetCredits: result.rateLimitResetCredits?.availableCount ?? null });
    } else {
      const directory = this.store.directory(account.id);
      const auth = await run(executable('claude'), ['auth', 'status', '--json'], { cwd: directory, env: profileEnv('claude', directory) });
      if (!auth.loggedIn) return this.update(account.id, { status: 'disconnected', windows: [], error: null });
      this.update(account.id, { status: 'connected', plan: auth.subscriptionType || 'Claude', email: auth.email });
      const usage = await this.claudeUsage.read(directory, options);
      this.update(account.id, { status: usage.error && !usage.updatedAt ? 'error' : 'connected', plan: auth.subscriptionType || 'Claude', email: auth.email,
        windows: usage.windows, updatedAt: usage.updatedAt, error: usage.error, usageSource: usage.source, nextQueryAt: usage.nextQueryAt });
    }
  }
  async connect(account) {
    if (account.provider === 'claude') { await this.openClaude(account, true); return; }
    if (this.login) throw new Error('Conclua ou cancele o login em andamento antes de conectar outra conta.');
    this.login = { accountId: account.id };
    this.update(account.id, { status: 'connecting', error: null });
    try {
      await this.inflight.get(account.id);
      const client = await this.client(account);
      const result = await client.request('account/login/start', { type: 'chatgpt' });
      if (this.login) this.login.loginId = result.loginId;
      const url = new URL(result.authUrl);
      if (url.protocol !== 'https:' || !['auth.openai.com', 'chatgpt.com', 'auth0.openai.com'].includes(url.hostname)) throw new Error('Endereço de autenticação não reconhecido.');
      await this.openExternal(url.href);
    } catch (error) { await this.cancel(account).catch(() => {}); this.update(account.id, { status: 'error', error: error.message }); throw error; }
  }
  async cancel(account) {
    if (this.login?.accountId === account.id) {
      try {
        if (this.login.loginId) await this.clients.get(account.id)?.request('account/login/cancel', { loginId: this.login.loginId });
      } finally {
        this.login = null; this.update(account.id, { status: 'disconnected', error: null });
      }
    }
  }
  async openClaude(account, login = false) {
    const cli = executable('claude');
    const directory = this.store.directory(account.id);
    const bridge = path.join(__dirname, 'claude-bridge.cjs');
    let bridgeCommand, launcher;
    if (process.platform === 'win32') {
      const wrapper = path.join(directory, 'statusline.ps1');
      fs.writeFileSync(wrapper, `$env:ELECTRON_RUN_AS_NODE = '1'\n[Console]::In.ReadToEnd() | & ${psQuote(process.execPath)} ${psQuote(bridge)}\n`, 'utf8');
      bridgeCommand = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${wrapper}"`;
      launcher = path.join(directory, 'open-claude.ps1');
      const scrub = "Get-ChildItem Env: | Where-Object { $_.Name -match '^(OPENAI_|CODEX_|ANTHROPIC_|CLAUDE_|AWS_|GOOGLE_APPLICATION_CREDENTIALS$)' } | ForEach-Object { Remove-Item -LiteralPath ('Env:' + $_.Name) }";
      fs.writeFileSync(launcher, `${scrub}\n$env:CLAUDE_CONFIG_DIR = ${psQuote(directory)}\nSet-Location -LiteralPath ${psQuote(directory)}\n${login ? `& ${psQuote(cli)} auth login --claudeai\nif ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }\n` : ''}& ${psQuote(cli)}\n`, 'utf8');
    } else {
      bridgeCommand = `ELECTRON_RUN_AS_NODE=1 ${shQuote(process.execPath)} ${shQuote(bridge)}`;
      launcher = path.join(directory, 'open-claude.command');
      fs.writeFileSync(launcher, `#!/bin/bash\nwhile IFS='=' read -r key rest; do case "$key" in OPENAI_*|CODEX_*|ANTHROPIC_*|CLAUDE_*|AWS_*|GOOGLE_APPLICATION_CREDENTIALS) unset "$key";; esac; done < <(env)\nexport CLAUDE_CONFIG_DIR=${shQuote(directory)}\ncd ${shQuote(directory)}\n${login ? `${shQuote(cli)} auth login --claudeai || exit $?\n` : ''}exec ${shQuote(cli)}\n`, { mode: 0o700 });
    }
    // This is a UDV-owned profile, never the user's ~/.claude/settings.json.
    const settingsFile = path.join(directory, 'settings.json');
    let settings = {};
    try { settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    fs.writeFileSync(settingsFile, JSON.stringify({ ...settings, statusLine: { type: 'command', command: bridgeCommand } }, null, 2), { mode: 0o600 });
    if (process.platform === 'win32') {
      // A terminal is intentionally visible here: authentication and Claude are interactive.
      const script = `Start-Process powershell.exe -ArgumentList @('-NoProfile', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', ${psQuote('"' + launcher + '"')})`;
      await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true });
    } else if (process.platform === 'darwin') {
      await promisify(execFile)('/usr/bin/open', ['-a', 'Terminal', launcher]);
    } else throw new Error('Esta versão oferece suporte a Windows e macOS.');
  }
  async remove(account) {
    await this.cancel(account);
    await this.inflight.get(account.id);
    if (account.provider === 'codex') {
      if (fs.existsSync(path.join(this.store.directory(account.id), 'auth.json'))) {
        const client = await this.client(account); await client.request('account/logout');
      }
      this.clients.get(account.id)?.close(); this.clients.delete(account.id);
    } else if (fs.existsSync(path.join(this.store.directory(account.id), 'settings.json'))) {
      await promisify(execFile)(executable('claude'), ['auth', 'logout'], { cwd: this.store.directory(account.id), env: profileEnv('claude', this.store.directory(account.id)), windowsHide: true, timeout: 20000 });
    }
    this.store.remove(account.id); this.states.delete(account.id); this.changed();
  }
  close() { for (const client of this.clients.values()) client.close(); }
}
module.exports = { Providers, psQuote, shQuote };
