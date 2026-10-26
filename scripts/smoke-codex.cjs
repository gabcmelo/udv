const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { RpcClient, executable, profileEnv } = require('../electron/process.cjs');
(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-codex-smoke-'));
  const client = new RpcClient(executable('codex'), ['-c', 'cli_auth_credentials_store="file"', 'app-server', '--listen', 'stdio://'], { cwd: root, env: profileEnv('codex', root) });
  try {
    await client.initialize();
    const result = await client.request('account/read', { refreshToken: false });
    if (result.account !== null) throw new Error('O perfil de teste deveria estar desconectado.');
    console.log('PASS: app-server real inicializado; perfil isolado e desconectado; nenhum login iniciado.');
  } finally {
    client.close(); await new Promise(resolve => setTimeout(resolve, 1000));
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
