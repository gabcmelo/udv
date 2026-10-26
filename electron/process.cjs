const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createInterface } = require('node:readline');
function executable(name) {
  const home = os.homedir();
  const dirs = [...(process.env.PATH || '').split(path.delimiter), path.join(home, '.local', 'bin'),
    '/opt/homebrew/bin', '/usr/local/bin', path.join(home, '.npm-global', 'bin'),
    path.join(home, 'AppData', 'Local', 'Programs', 'OpenAI', 'Codex', 'bin')];
  for (const dir of dirs) {
    for (const file of process.platform === 'win32' ? [`${name}.exe`] : [name]) {
      const full = path.join(dir, file);
      try { fs.accessSync(full, fs.constants.X_OK); if (fs.statSync(full).isFile()) return full; } catch {}
    }
  }
  throw new Error(`${name === 'codex' ? 'Codex' : 'Claude Code'} CLI não encontrado. Instale a versão nativa e reabra o UDV.`);
}
function profileEnv(provider, directory) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(OPENAI_|CODEX_|ANTHROPIC_|CLAUDE_|AWS_|GOOGLE_APPLICATION_CREDENTIALS$)/.test(key)) delete env[key];
  }
  env[provider === 'codex' ? 'CODEX_HOME' : 'CLAUDE_CONFIG_DIR'] = directory;
  return env;
}
function run(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024, ...options }, (error, stdout) => {
      if (error && !stdout.trim().startsWith('{')) reject(new Error('Não foi possível consultar o CLI. Verifique a instalação e tente novamente.'));
      else { try { resolve(JSON.parse(stdout)); } catch { reject(new Error('O CLI retornou um formato inesperado. Atualize o CLI.')); } }
    });
  });
}
class RpcClient {
  constructor(file, args, options, notify = () => {}) {
    this.nextId = 0; this.pending = new Map(); this.closed = false;
    this.child = spawn(file, args, { ...options, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stderr.resume();
    this.lines = createInterface({ input: this.child.stdout });
    this.lines.on('line', line => {
      let message; try { message = JSON.parse(line); } catch { return; }
      if (message.id != null && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id); this.pending.delete(message.id); clearTimeout(pending.timer);
        message.error ? pending.reject(new Error('O Codex não conseguiu concluir a consulta. Reconecte a conta ou atualize o CLI.')) : pending.resolve(message.result);
      } else if (message.method && message.id == null) notify(message.method, message.params);
      else if (message.id != null) this.send({ id: message.id, error: { code: -32601, message: 'Unsupported method' } });
    });
    this.child.on('error', () => this.fail());
    this.child.on('exit', () => this.fail());
    this.child.stdin.on('error', () => this.fail());
  }
  fail() {
    this.closed = true;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('O processo Codex foi encerrado. Tente atualizar novamente.')); }
    this.pending.clear();
  }
  send(message) { if (!this.closed) this.child.stdin.write(JSON.stringify(message) + '\n'); }
  request(method, params = {}) {
    if (this.closed) return Promise.reject(new Error('Codex desconectado. Tente novamente.'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('O Codex demorou para responder. Tente novamente.')); }, 25000);
      this.pending.set(id, { resolve, reject, timer }); this.send({ id, method, params });
    });
  }
  async initialize() {
    await this.request('initialize', { clientInfo: { name: 'usage_dash_view', title: 'UDV', version: require('../package.json').version } });
    this.send({ method: 'initialized', params: {} }); return this;
  }
  close() { this.fail(); this.lines.close(); this.child.kill(); }
}
module.exports = { executable, profileEnv, run, RpcClient };
