import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { version } from '../package.json';
import type { UpdateState } from './types';

const deferredKey = 'udv:update-later';
const initialState: UpdateState = { status: 'disabled', currentVersion: version, version: null, percent: null, checkedAt: null, error: null };
function deferredVersion() { try { return localStorage.getItem(deferredKey); } catch { return null; } }

export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>(initialState);
  const [actionError, setActionError] = useState('');
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [deferred, setDeferred] = useState(deferredVersion);
  const mounted = useRef(false);
  const actionPending = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const api = window.udv;
    let active = true, request = 0;
    const read = async () => {
      const current = ++request;
      try {
        const value = await api!.updater();
        if (active && current === request) {
          setState(value); setActionError('');
          // Installation failures can arrive as an updater event after IPC resolves.
          if (value.status !== 'downloaded') setInstalling(false);
        }
      } catch {
        if (active && current === request) setActionError('Não conseguimos consultar as atualizações do UDV.');
      }
    };
    const unsubscribe = api?.onUpdateChange ? api.onUpdateChange(() => { void read(); }) : () => {};
    if (api?.updater) void read();
    const storage = (event: StorageEvent) => { if (event.key === deferredKey) setDeferred(event.newValue); };
    window.addEventListener('storage', storage);
    return () => { active = false; mounted.current = false; request++; unsubscribe(); window.removeEventListener('storage', storage); };
  }, []);

  async function check() {
    const api = window.udv;
    if (!api || state.status === 'disabled' || actionPending.current) return;
    actionPending.current = true; setChecking(true); setActionError('');
    try {
      // Event subscriptions supply the current state while the check/download runs.
      await api.checkForUpdates();
    } catch {
      if (mounted.current) setActionError('Não conseguimos verificar as atualizações do UDV. Tente novamente.');
    } finally {
      actionPending.current = false;
      if (mounted.current) setChecking(false);
    }
  }

  async function install() {
    const api = window.udv;
    if (!api || state.status !== 'downloaded' || actionPending.current) return;
    actionPending.current = true; setInstalling(true); setActionError('');
    try { await api.installUpdate(); }
    catch {
      if (mounted.current) { setInstalling(false); setActionError('Não conseguimos instalar a atualização. Tente novamente.'); }
    } finally { actionPending.current = false; }
  }

  function later() {
    setDeferred(state.version);
    try { if (state.version) localStorage.setItem(deferredKey, state.version); } catch { /* Session dismissal still works without storage. */ }
  }

  return { state, actionError, checking, installing, check, install, later,
    showReady: state.status === 'downloaded' && !!state.version && state.version !== deferred };
}

type Updater = ReturnType<typeof useAppUpdate>;
function statusText(state: UpdateState) {
  switch (state.status) {
    case 'disabled': return 'Atualizações do app ficam disponíveis na versão instalada.';
    case 'checking': return 'Verificando atualizações…';
    case 'up-to-date': return 'Você está usando a versão mais recente.';
    case 'downloading': return `Baixando UDV ${state.version ?? ''}…${state.percent == null ? '' : ` ${Math.round(Math.max(0, Math.min(100, state.percent)))}%`}`;
    case 'downloaded': return `UDV ${state.version ?? ''} está pronto para instalar.`;
    case 'error': return state.error || 'Não conseguimos atualizar o UDV. Tente novamente.';
    default: return 'O UDV verifica e baixa novas versões automaticamente.';
  }
}

export function AppUpdate({ updater }: { updater: Updater }) {
  const { state, checking, installing } = updater;
  const busy = checking || installing || state.status === 'checking' || state.status === 'downloading';
  const percent = state.percent == null ? undefined : Math.max(0, Math.min(100, state.percent));
  return <section className="app-update" aria-label="Atualizações do UDV">
    <div className="app-update-heading"><h2>Atualizações do UDV</h2><span>Versão instalada: {state.currentVersion}</span></div>
    <p role="status" aria-live="polite">{statusText(state)}</p>
    {state.status === 'downloading' && <progress aria-label="Download da atualização do UDV" max={100} value={percent} />}
    {state.checkedAt != null && <span className="update-checked">Última verificação: {new Date(state.checkedAt).toLocaleString('pt-BR')}</span>}
    {state.status === 'downloaded' && <p>Suas contas e preferências serão mantidas. Instale quando puder reiniciar o UDV.</p>}
    <div className="update-actions">{state.status === 'downloaded'
      ? <button className="primary" disabled={installing} onClick={() => { void updater.install(); }}>{installing ? 'Reiniciando…' : 'Reiniciar e instalar'}</button>
      : <button disabled={state.status === 'disabled' || busy} onClick={() => { void updater.check(); }}><RefreshCw size={13} className={state.status === 'checking' || checking ? 'spinning' : ''} />{state.status === 'error' ? 'Tentar novamente' : 'Verificar atualizações'}</button>}
    </div>
    {updater.actionError && <p className="update-error" role="alert">{updater.actionError}</p>}
  </section>;
}

export function UpdateReadyNotice({ updater, popup, openPanel }: { updater: Updater; popup: boolean; openPanel: () => void }) {
  if (!updater.showReady) return null;
  return <div className="update-ready" aria-label="Atualização pronta">
    <span role="status"><Download size={14} />UDV {updater.state.version} pronto para instalar</span>
    <div className="update-actions">{popup
      ? <button onClick={openPanel}>Abrir painel</button>
      : <button disabled={updater.installing} onClick={() => { void updater.install(); }}>{updater.installing ? 'Reiniciando…' : 'Reiniciar e instalar'}</button>}
      <button disabled={updater.installing} onClick={updater.later}>Depois</button></div>
    {updater.actionError && <p className="update-error" role="alert">{updater.actionError}</p>}
  </div>;
}
