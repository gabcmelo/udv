const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdater } = require('../electron/updater.cjs');

function fixture({ enabled = true, appVersion = '0.1.0' } = {}) {
  const driver = new EventEmitter();
  let clock = 100_000, calls = 0;
  const installs = [], changes = [], timers = new Map();
  driver.checkForUpdates = async () => { calls++; driver.emit('update-not-available', { version: appVersion }); return { isUpdateAvailable: false }; };
  driver.quitAndInstall = (...args) => installs.push(args);
  const updater = createUpdater({ autoUpdater: driver, appVersion, enabled, now: () => clock,
    onChange: state => changes.push(state),
    setTimeout: (callback, delay) => { const token = {}; timers.set(token, { callback, delay }); return token; },
    clearTimeout: token => timers.delete(token),
  });
  return { updater, driver, installs, changes, timers, calls: () => calls, advance: ms => { clock += ms; } };
}

test('development never checks or schedules updates and cannot install', async () => {
  const f = fixture({ enabled: false });
  f.updater.start();
  assert.equal((await f.updater.check()).status, 'disabled');
  assert.equal(f.timers.size, 0); assert.equal(f.calls(), 0);
  assert.throws(() => f.updater.install(), /Nenhuma atualização/);
  assert.equal(f.driver.autoInstallOnAppQuit, false);
});

test('a downloaded stable upgrade installs only on an explicit action', async () => {
  const f = fixture();
  f.driver.checkForUpdates = async () => { f.driver.emit('update-available', { version: '0.1.1' }); return { downloadPromise: Promise.resolve(['file']) }; };
  assert.equal((await f.updater.check()).status, 'downloading');
  assert.equal(f.driver.autoDownload, true);
  assert.equal(f.driver.allowPrerelease, false); assert.equal(f.driver.allowDowngrade, false);
  f.driver.emit('download-progress', { percent: 42.5 });
  assert.equal(f.updater.read().percent, 42.5);
  assert.throws(() => f.updater.install(), /Nenhuma atualização/);
  f.driver.emit('update-downloaded', { version: '0.1.1' });
  assert.equal(f.updater.read().status, 'downloaded');
  assert.equal(f.updater.read().version, '0.1.1');
  assert.deepEqual(f.installs, []);
  await f.updater.check();
  assert.equal(f.updater.read().status, 'downloaded');
  f.updater.install(); f.updater.install();
  assert.deepEqual(f.installs, [[false, true]]);
  assert.equal(f.driver.autoInstallOnAppQuit, false);
});

test('manual checks share an in-flight request and honor cooldown', async () => {
  const f = fixture();
  let release, calls = 0;
  f.driver.checkForUpdates = () => { calls++; return new Promise(resolve => { release = resolve; }); };
  const first = f.updater.check(), second = f.updater.check();
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  f.driver.emit('update-not-available', { version: '0.1.0' }); release({ isUpdateAvailable: false });
  await first;
  assert.equal(f.updater.read().status, 'up-to-date');
  await f.updater.check(); assert.equal(calls, 1);
  f.advance(60_000);
  const third = f.updater.check(); await Promise.resolve();
  assert.equal(calls, 2);
  f.driver.emit('update-not-available', { version: '0.1.0' }); release({ isUpdateAvailable: false }); await third;
});

test('same, older, prerelease and malformed targets never download or install', async () => {
  for (const version of ['0.1.0', '0.0.9', '0.2.0-beta.1', 'not-a-version', '01.2.0', '0.1.1+..', '0.1.1\n', '0.9007199254740992.0', undefined]) {
    const f = fixture();
    f.driver.checkForUpdates = async () => {
      f.driver.emit('update-available', { version });
      assert.equal(f.driver.autoDownload, false);
      return { isUpdateAvailable: true };
    };
    assert.equal((await f.updater.check()).status, 'error');
    f.driver.emit('update-downloaded', { version });
    assert.throws(() => f.updater.install(), /Nenhuma atualização/);
    assert.deepEqual(f.installs, []);
  }
});

test('an unsolicited or mismatched downloaded update cannot be installed', async () => {
  const f = fixture();
  f.driver.emit('update-downloaded', { version: '0.1.1' });
  assert.throws(() => f.updater.install(), /Nenhuma atualização/);
  f.driver.checkForUpdates = async () => { f.driver.emit('update-available', { version: '0.1.1' }); return {}; };
  await f.updater.check();
  f.driver.emit('update-downloaded', { version: '0.1.2' });
  assert.equal(f.updater.read().status, 'error');
  assert.throws(() => f.updater.install(), /Nenhuma atualização/);
});

test('offline check and rejected download promises remain handled and can retry', async () => {
  const f = fixture();
  f.driver.checkForUpdates = async () => { throw new Error('private URL and token'); };
  assert.equal((await f.updater.check()).status, 'error');
  assert.doesNotMatch(f.updater.read().error, /private URL/);
  f.advance(60_000);
  f.driver.checkForUpdates = async () => {
    f.driver.emit('update-available', { version: '0.1.1' });
    return { downloadPromise: Promise.reject(new Error('checksum mismatch')) };
  };
  await f.updater.check(); await Promise.resolve();
  assert.equal(f.updater.read().status, 'error');
  assert.throws(() => f.updater.install(), /Nenhuma atualização/);
  f.advance(60_000);
  f.driver.checkForUpdates = async () => { f.driver.emit('update-not-available', { version: '0.1.0' }); return {}; };
  assert.equal((await f.updater.check()).status, 'up-to-date');
});

test('initial delay, periodic checks and overdue resume share one scheduler', async () => {
  const f = fixture();
  f.updater.start(); f.updater.start();
  assert.equal(f.timers.size, 1);
  const first = [...f.timers.values()][0];
  assert.equal(first.delay, 15_000);
  await f.updater.handleResume(); assert.equal(f.calls(), 0);
  f.advance(15_000);
  await f.updater.handleResume();
  assert.equal(f.calls(), 1); assert.equal(f.timers.size, 1);
  assert.equal([...f.timers.values()][0].delay, 6 * 60 * 60 * 1000);
  f.advance(6 * 60 * 60 * 1000);
  const timer = [...f.timers.entries()][0]; f.timers.delete(timer[0]); timer[1].callback();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.calls(), 2); assert.equal(f.timers.size, 1);
});

test('stopping cancels scheduling and consumes late errors without installing', async () => {
  const f = fixture();
  let cancelled = false;
  f.driver.checkForUpdates = async () => { f.driver.emit('update-available', { version: '0.1.1' }); return { cancellationToken: { cancel: () => { cancelled = true; } } }; };
  f.updater.start(); await f.updater.check(); f.updater.stop();
  assert.equal(cancelled, true); assert.equal(f.timers.size, 0);
  assert.doesNotThrow(() => f.driver.emit('error', new Error('late error')));
  f.driver.emit('update-downloaded', { version: '0.1.1' });
  assert.throws(() => f.updater.install(), /Nenhuma atualização/);
  assert.deepEqual(f.installs, []);
});

test('a native installer error leaves a retryable error state', async () => {
  const f = fixture();
  f.driver.checkForUpdates = async () => { f.driver.emit('update-available', { version: '0.1.1' }); return {}; };
  await f.updater.check();
  f.driver.emit('update-downloaded', { version: '0.1.1' });
  f.driver.quitAndInstall = () => f.driver.emit('error', new Error('installer failed'));
  assert.equal(f.updater.install().status, 'error');
  assert.throws(() => f.updater.install(), /Nenhuma atualização/);
  f.advance(60_000);
  assert.equal((await f.updater.check()).status, 'downloading');
});
