const { spawn } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'udv-visual-review-'));
const env = { ...process.env, UDV_TEST_USER_DATA_DIR: profile }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.resolve(__dirname, '..')], { env, stdio: 'inherit' });
child.on('exit', code => { fs.rmSync(profile, { recursive: true, force: true }); process.exit(code || 0); });
process.on('SIGINT', () => child.kill());
