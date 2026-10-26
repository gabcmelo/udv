const INITIAL_DELAY = 15_000;
const CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const MANUAL_COOLDOWN = 60_000;

function parseVersion(value) {
  if (typeof value !== 'string') return null;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  if (!match || match[0] !== value) return null;
  if (match[4]?.slice(1).split('.').some(part => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) return null;
  const parts = match.slice(1, 4).map(Number);
  return parts.every(Number.isSafeInteger) ? { parts, prerelease: !!match[4] } : null;
}

function newerStable(version, currentVersion) {
  const target = parseVersion(version), current = parseVersion(currentVersion);
  if (!target || target.prerelease || !current) return false;
  for (let i = 0; i < 3; i++) {
    if (target.parts[i] !== current.parts[i]) return target.parts[i] > current.parts[i];
  }
  return current.prerelease;
}

function createUpdater({ autoUpdater, appVersion, enabled, onChange = () => {}, now = Date.now,
  setTimeout: scheduleTimeout = globalThis.setTimeout, clearTimeout: cancelTimeout = globalThis.clearTimeout }) {
  enabled = !!enabled && !!autoUpdater && !!parseVersion(appVersion);
  let state = { status: enabled ? 'idle' : 'disabled', currentVersion: appVersion, version: null, percent: null, checkedAt: null, error: null };
  let pending = null, expected = null, accepting = false, stopped = false, installing = false;
  let running = false, timer = null, nextDueAt = null, lastAttemptAt = null, cancellation = null;
  const read = () => ({ ...state });
  const change = patch => {
    state = { ...state, ...patch };
    // A renderer being destroyed must not interrupt updater event dispatch.
    try { onChange(read()); } catch {}
  };
  const fail = () => {
    if (stopped || !enabled) return;
    accepting = false; expected = null; installing = false;
    change({ status: 'error', version: null, percent: null, checkedAt: now(), error: 'Não conseguimos atualizar o UDV. Aguarde um minuto e tente novamente.' });
  };
  const invalidTarget = () => {
    // electron-updater reads autoDownload immediately after update-available.
    autoUpdater.autoDownload = false;
    cancellation?.cancel();
    fail();
  };

  if (autoUpdater) {
    autoUpdater.autoDownload = enabled;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.autoRunAppAfterInstall = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.on('update-available', info => {
      if (stopped || !accepting || state.status !== 'checking') return;
      if (!newerStable(info?.version, appVersion)) { invalidTarget(); return; }
      expected = info.version;
      change({ status: 'downloading', version: expected, percent: 0, checkedAt: now(), error: null });
    });
    autoUpdater.on('update-not-available', () => {
      if (stopped || !accepting || state.status !== 'checking') return;
      accepting = false; expected = null;
      change({ status: 'up-to-date', version: null, percent: null, checkedAt: now(), error: null });
    });
    autoUpdater.on('download-progress', progress => {
      if (stopped || !accepting || state.status !== 'downloading' || !Number.isFinite(progress?.percent)) return;
      change({ percent: Math.max(0, Math.min(100, progress.percent)) });
    });
    autoUpdater.on('update-downloaded', info => {
      if (stopped || !accepting) return;
      if (state.status !== 'downloading' || info?.version !== expected || !newerStable(info?.version, appVersion)) { invalidTarget(); return; }
      accepting = false;
      change({ status: 'downloaded', percent: 100, error: null });
    });
    // Keep this listener after stop(): late download errors must remain handled.
    autoUpdater.on('error', () => { if (accepting || installing) fail(); });
  }

  function check() {
    if (!enabled || stopped) return Promise.resolve(read());
    if (pending) return pending;
    if (['downloading', 'downloaded'].includes(state.status)) return Promise.resolve(read());
    if (lastAttemptAt !== null && now() - lastAttemptAt < MANUAL_COOLDOWN) return Promise.resolve(read());
    lastAttemptAt = now(); accepting = true; expected = null; cancellation = null;
    autoUpdater.autoDownload = true;
    change({ status: 'checking', version: null, percent: null, error: null });
    pending = Promise.resolve().then(() => autoUpdater.checkForUpdates()).then(result => {
      cancellation = result?.cancellationToken || null;
      if (stopped) cancellation?.cancel();
      // checkForUpdates resolves before downloading finishes. Its separate promise
      // rejects on offline/invalid checksum, even when an error event was emitted.
      if (result?.downloadPromise) void Promise.resolve(result.downloadPromise).catch(() => {
        if (accepting) fail();
      });
      if (!stopped && state.status === 'checking') fail();
      return read();
    }).catch(() => { fail(); return read(); }).finally(() => { pending = null; });
    return pending;
  }

  function install() {
    if (!enabled || stopped || state.status !== 'downloaded' || !newerStable(expected, appVersion)) {
      throw new Error('Nenhuma atualização pronta para instalar.');
    }
    if (installing) return read();
    installing = true;
    try { autoUpdater.quitAndInstall(false, true); } catch { fail(); }
    return read();
  }

  function schedule(delay) {
    if (!running || stopped) return;
    if (timer !== null) cancelTimeout(timer);
    nextDueAt = now() + delay;
    timer = scheduleTimeout(() => { timer = null; void automaticCheck(); }, delay);
    timer?.unref?.();
  }
  async function automaticCheck() {
    if (!running || stopped) return read();
    const result = await check();
    if (running && !stopped) schedule(CHECK_INTERVAL);
    return result;
  }
  function start() {
    if (!enabled || stopped || running) return;
    running = true;
    schedule(INITIAL_DELAY);
  }
  function handleResume() {
    if (running && nextDueAt !== null && now() >= nextDueAt) return automaticCheck();
    return Promise.resolve(read());
  }
  function stop() {
    stopped = true; running = false; accepting = false;
    if (timer !== null) cancelTimeout(timer);
    timer = null; nextDueAt = null;
    if (autoUpdater) autoUpdater.autoDownload = false;
    cancellation?.cancel();
  }
  return { read, check, install, start, stop, handleResume };
}

module.exports = { createUpdater };
