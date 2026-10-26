// One interpretation of freshness is used by both the tray and the renderer.
const STALE_MS = 45 * 60 * 1000;
function expired(window, now = Date.now()) { return window.expired || (window.resetsAt != null && window.resetsAt <= now); }
function statusOf(account, now = Date.now()) {
  if (account.status === 'connecting') return 'connecting';
  if (account.status === 'disconnected') return 'disconnected';
  if (account.status === 'error') return 'error';
  if (!account.updatedAt || !account.windows.length) return 'unknown';
  if (now - account.updatedAt >= STALE_MS) return account.windows.some(w => expired(w, now)) ? 'expired' : 'stale';
  const valid = account.windows.filter(w => !expired(w, now));
  if (valid.some(w => w.usedPercent >= 100)) return 'exhausted';
  if (valid.some(w => w.usedPercent >= 80)) return 'near';
  if (account.windows.some(w => expired(w, now))) return 'expired';
  return 'ok';
}
const labels = { exhausted: 'Esgotada', near: 'Perto do limite', disconnected: 'Conectar', connecting: 'Conectando', error: 'Verificar conexão', expired: 'Leitura expirada', stale: 'Leitura antiga', unknown: 'Sem leitura', ok: 'Leitura recente' };
const ranks = { exhausted: 0, error: 1, disconnected: 2, near: 3, expired: 4, unknown: 5, stale: 6, connecting: 7, ok: 8 };
function sortAccounts(accounts, now = Date.now()) {
  return [...accounts].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || ranks[statusOf(a, now)] - ranks[statusOf(b, now)] || a.createdAt - b.createdAt);
}
function summarize(accounts, now = Date.now()) {
  if (!accounts.length) return { text: 'Nenhuma conta conectada', badge: 'unknown' };
  const statuses = accounts.map(a => statusOf(a, now));
  const count = status => statuses.filter(s => s === status).length;
  const exhausted = count('exhausted'), near = count('near'), unknown = statuses.filter(s => !['ok', 'near', 'exhausted'].includes(s)).length;
  const problems = [exhausted && `${exhausted} esgotada${exhausted > 1 ? 's' : ''}`, near && `${near} perto do limite`, unknown && `${unknown} sem leitura confirmada`].filter(Boolean);
  return { text: `${accounts.length} conta${accounts.length > 1 ? 's' : ''}${problems.length ? ': ' + problems.join(', ') : ', todas com leitura recente'}`, badge: exhausted ? 'exhausted' : near ? 'near' : unknown ? 'unknown' : 'ok' };
}
module.exports = { STALE_MS, expired, statusOf, labels, sortAccounts, summarize };
