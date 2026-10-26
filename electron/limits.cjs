// Missing or expired windows stay unknown instead of becoming zero usage.
function windowOf(id, label, used, reset, duration, now = Date.now()) {
  if (typeof used !== 'number' || !Number.isFinite(used)) return null;
  const resetsAt = typeof reset === 'number' && Number.isFinite(reset) ? reset * 1000 : null;
  return { id, label, usedPercent: Math.min(100, Math.max(0, used)), resetsAt,
    durationMinutes: duration, expired: resetsAt !== null && resetsAt <= now };
}
function codexLimits(response, now) {
  const buckets = response.rateLimitsByLimitId && Object.keys(response.rateLimitsByLimitId).length
    ? Object.entries(response.rateLimitsByLimitId) : [['codex', response.rateLimits]];
  return buckets.flatMap(([id, bucket]) => {
    if (!bucket) return [];
    return ['primary', 'secondary'].flatMap(key => {
      const w = bucket[key];
      if (!w) return [];
      const duration = w.windowDurationMins;
      const label = duration === 10080 ? 'Semanal' : duration === 300 ? 'Janela de 5 horas'
        : duration ? (duration >= 60 && duration % 60 === 0 ? `Janela de ${duration / 60} horas` : `Janela de ${duration} min`) : 'Janela de uso';
      const result = windowOf(`${id}:${key}`, `${bucket.limitName ? bucket.limitName + ' · ' : ''}${label}`, w.usedPercent, w.resetsAt, duration ?? null, now);
      return result ? [result] : [];
    });
  });
}
function claudeLimits(data, now) {
  return [['five_hour', 'Janela de 5 horas', 300], ['seven_day', 'Semanal', 10080], ['spend_limit', 'Limite de gastos', null]]
    .flatMap(([id, label, minutes]) => {
      const w = data.rate_limits?.[id];
      const result = windowOf(id, label, w?.used_percentage, w?.resets_at, minutes, now);
      return result ? [result] : [];
    });
}
module.exports = { codexLimits, claudeLimits };
