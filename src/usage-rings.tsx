import { expired } from '../shared/usage.cjs';
import type { Provider, UsageWindow } from './types';

export function shortWindow(window: UsageWindow) {
  return window.id.startsWith('seven_day_') ? window.label.replace('Semanal · ', '')
    : window.durationMinutes === 300 ? '5 h' : window.durationMinutes === 10080 ? 'Semana' : window.label;
}
function reset(timestamp: number | null, now: number) {
  if (timestamp === null) return 'horário não informado';
  if (timestamp <= now) return 'sem leitura nova';
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `renova ${timestamp - now > 86400000 ? date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + ' ' : ''}${time}`;
}
type RingState = 'normal' | 'near' | 'exhausted' | 'unconfirmed' | 'unknown';
function CenterMark({ state, center }: { state: RingState; center: number }) {
  return <g transform={`translate(${center} ${center})`} className={`ring-center ${state}`}>
    {state === 'exhausted' ? <rect x="-2.7" y="-2.7" width="5.4" height="5.4" rx="1" />
      : state === 'near' ? <path d="M0 -3.4L3.6 2.8H-3.6Z" />
        : state === 'unconfirmed' ? <><circle r="3.6" /><path d="M0 -2V0H1.6" /></>
          : state === 'unknown' ? <path d="M-2.6 0H2.6" /> : null}
  </g>;
}

/** Each ring represents consumed quota for one independent window. */
export function UsageRings({ windows, provider, now, uncertain }: { windows: UsageWindow[]; provider: Provider; now: number; uncertain: boolean }) {
  const readings = windows.map(w => {
    const unknown = expired(w, now) || !Number.isFinite(w.usedPercent);
    const used = Math.max(0, Math.min(100, w.usedPercent));
    const state: RingState = unknown ? 'unknown' : uncertain ? 'unconfirmed' : used >= 100 ? 'exhausted' : used >= 80 ? 'near' : 'normal';
    return { window: w, used, state };
  });
  const count = readings.length;
  // Keep the innermost radius positive even if a provider reports more model windows.
  const size = count >= 3 ? 68 + (count - 3) * 16 : count === 2 ? 56 : 44;
  const center = size / 2;
  const centerState: RingState = readings.some(r => r.state === 'exhausted') ? 'exhausted'
    : readings.some(r => r.state === 'near') ? 'near'
      : !count || readings.every(r => r.state === 'unknown') ? 'unknown'
        : readings.some(r => r.state === 'unconfirmed') ? 'unconfirmed' : 'normal';
  return <div className={`usage-rings rings-${provider}`} role="group" aria-label="Consumo por janela: o anel preenche conforme o uso aumenta">
    <svg className="rings-chart" width={Math.min(68, size)} height={Math.min(68, size)} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
      {count ? readings.map(({ window: w, used, state }, index) => {
        const radius = (size - 6) / 2 - index * 8;
        const circumference = 2 * Math.PI * radius;
        return <g key={w.id} className={`ring-band ring-tone-${index % 3} ${state}`}>
          <circle className={state === 'unknown' ? 'ring-unknown' : 'ring-track'} cx={center} cy={center} r={radius} strokeWidth="6" />
          {state !== 'unknown' && used > 0 && <circle className="ring-fill" cx={center} cy={center} r={radius} strokeWidth="6"
            strokeLinecap={used >= 6 && used < 100 ? 'round' : 'butt'} strokeDasharray={`${circumference * used / 100} ${circumference}`} transform={`rotate(-90 ${center} ${center})`} />}
        </g>;
      }) : <circle className="ring-unknown" cx={center} cy={center} r="19" strokeWidth="6" />}
      <CenterMark state={centerState} center={center} />
    </svg>
    <div className="rings-legend">{count ? readings.map(({ window: w, used, state }, index) => {
      const unknown = state === 'unknown';
      const context = state === 'exhausted' ? 'Esgotada · ' : state === 'near' ? 'Perto do limite · ' : state === 'unconfirmed' ? 'Última leitura · ' : '';
      const rounded = Math.round(used);
      return <div key={w.id} className={`ring-reading ring-tone-${index % 3} ${state}`}
        role={unknown ? 'group' : 'meter'} aria-label={`${w.label}: ${unknown ? 'sem leitura confirmada' : `${rounded}% usado, ${100 - rounded}% restante${uncertain ? ' na última leitura' : ''}`}`}
        aria-valuemin={unknown ? undefined : 0} aria-valuemax={unknown ? undefined : 100} aria-valuenow={unknown ? undefined : used}>
        <span className="ring-key" aria-hidden="true" />
        <span className="ring-description"><b title={w.label}>{shortWindow(w)}</b><span className="ring-reset" title={w.resetsAt ? new Date(w.resetsAt).toLocaleString('pt-BR') : undefined}>{context}{reset(w.resetsAt, now)}</span></span>
        <span className="ring-values">{unknown ? <b>—</b> : <><span>usado <b>{rounded}%</b></span><span className="ring-remaining">restam {100 - rounded}%</span></>}</span>
      </div>;
    }) : <div className="ring-reading unknown"><span className="ring-key" aria-hidden="true" /><span className="ring-description"><b>Limites</b><span className="ring-reset">sem leitura</span></span><span className="ring-values"><b>—</b></span></div>}</div>
  </div>;
}
