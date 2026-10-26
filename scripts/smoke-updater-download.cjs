// Windows-only, localhost-only download smoke. The fixture is NOT an executable
// and is NEVER installed. This does not validate signing or an actual upgrade.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');

async function electronHarness(config) {
  const assert = require('node:assert/strict');
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const { app } = require('electron');
  const { createUpdater } = require(path.join(config.root, 'electron', 'updater.cjs'));
  const { NsisUpdater } = require(path.join(config.root, 'node_modules', 'electron-updater'));
  app.setName('UDV Updater Download Smoke');
  app.setPath('userData', path.join(config.temporary, 'profile'));
  let installAttempts = 0;
  try {
    await app.whenReady();
    assert.equal(app.getVersion(), config.currentVersion);
    const results = [];
    for (const scenario of ['valid', 'checksum', 'offline']) {
      const configFile = path.join(config.temporary, `${scenario}.yml`);
      // JSON is valid YAML. No production feed, auth token or publisher is used.
      await fs.writeFile(configFile, JSON.stringify({ provider: 'generic', url: `${config.url}/${scenario}/`, updaterCacheDirName: `udv-download-smoke-${scenario}` }));
      const driver = new NsisUpdater();
      driver.logger = null;
      driver.forceDevUpdateConfig = true;
      driver.updateConfigPath = configFile;
      driver.disableDifferentialDownload = true;
      driver.disableWebInstaller = true;
      Object.defineProperty(driver.app, 'baseCachePath', { value: path.join(config.temporary, 'cache') });
      const forbiddenInstall = () => { installAttempts++; throw new Error('Smoke test must never install an update.'); };
      driver.quitAndInstall = forbiddenInstall;
      driver.doInstall = forbiddenInstall;
      let resolveTerminal, rejectTerminal;
      const terminal = new Promise((resolve, reject) => { resolveTerminal = resolve; rejectTerminal = reject; });
      const timeout = setTimeout(() => rejectTerminal(new Error(`Updater smoke timed out: ${scenario}`)), 20_000);
      const controller = createUpdater({ autoUpdater: driver, appVersion: config.currentVersion, enabled: true,
        onChange: state => { if (state.status === 'downloaded' || state.status === 'error') resolveTerminal(state); } });
      try {
        const [, state] = await Promise.all([controller.check(), terminal]);
        assert.equal(state.status, scenario === 'valid' ? 'downloaded' : 'error', scenario);
        if (scenario === 'valid') {
          const file = await fs.readFile(driver.downloadedUpdateHelper.file);
          assert.equal(file.length, config.payloadSize);
          assert.equal(require('node:crypto').createHash('sha512').update(file).digest('base64'), config.sha512);
          assert.equal(state.version, config.targetVersion);
        }
        assert.equal(driver.autoInstallOnAppQuit, false);
        assert.equal(installAttempts, 0);
        results.push({ scenario, status: state.status });
      } finally {
        clearTimeout(timeout);
        controller.stop();
        if (driver.downloadPromise) await driver.downloadPromise.catch(() => {});
      }
    }
    console.log(`UDV_UPDATER_DOWNLOAD_RESULT ${JSON.stringify({ results, installAttempts })}`);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('SKIP: download smoke exercises the real Windows NSIS updater.');
    return;
  }
  const root = path.resolve(__dirname, '..');
  const currentVersion = require('../package.json').version;
  const parts = currentVersion.split('.').map(Number);
  assert.equal(parts.length, 3);
  assert.ok(parts.every(Number.isSafeInteger), 'Run with a stable project version.');
  const targetVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'udv-download-smoke-'));
  if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('udv-download-smoke-')) throw new Error('Unsafe smoke directory.');
  const payload = Buffer.from('UDV download-integrity fixture. This file is not an executable.\n'.repeat(2048));
  const sha512 = createHash('sha512').update(payload).digest('base64');
  const requests = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    requests.push(url.pathname);
    if (url.pathname.startsWith('/offline/')) { request.socket.destroy(); return; }
    if (/^\/(valid|checksum)\/latest\.yml$/.test(url.pathname)) {
      const checksum = url.pathname.startsWith('/checksum/') ? Buffer.alloc(64).toString('base64') : sha512;
      const manifest = `version: ${targetVersion}\nfiles:\n  - url: fixture.exe\n    sha512: ${checksum}\n    size: ${payload.length}\npath: fixture.exe\nsha512: ${checksum}\nreleaseDate: 2026-01-01T00:00:00.000Z\n`;
      response.writeHead(200, { 'content-type': 'text/yaml' }); response.end(manifest); return;
    }
    if (/^\/(valid|checksum)\/fixture\.exe$/.test(url.pathname)) {
      response.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': payload.length }); response.end(payload); return;
    }
    response.writeHead(404); response.end();
  });
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const config = { root, temporary, currentVersion, targetVersion, sha512, payloadSize: payload.length, url: `http://127.0.0.1:${server.address().port}` };
    await fs.writeFile(path.join(temporary, 'package.json'), JSON.stringify({ name: 'udv-updater-download-smoke', version: currentVersion, main: 'main.cjs' }));
    await fs.writeFile(path.join(temporary, 'main.cjs'), `(${electronHarness.toString()})(${JSON.stringify(config)});\n`);
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(require('electron'), [temporary], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk.toString()).slice(-65_536); });
    const timeout = setTimeout(() => child.kill(), 65_000);
    let exitCode;
    try { exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); }); }
    finally { clearTimeout(timeout); }
    assert.equal(exitCode, 0, output);
    const result = /UDV_UPDATER_DOWNLOAD_RESULT (\{[^\r\n]+\})/.exec(output);
    assert.ok(result, output);
    assert.equal(JSON.parse(result[1]).installAttempts, 0);
    for (const endpoint of ['/valid/latest.yml', '/valid/fixture.exe', '/checksum/latest.yml', '/checksum/fixture.exe', '/offline/latest.yml']) assert.ok(requests.includes(endpoint), endpoint);
    console.log('PASS: real Electron/NSIS updater downloaded and checked a localhost fixture, rejected a bad SHA512, handled offline failure, and never installed anything. Signing and actual installation are not covered.');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
