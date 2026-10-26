import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ChevronDown, CircleAlert, LayoutPanelTop, Pin, PinOff, Plus, RefreshCw, Search, Settings2, ShieldCheck, Star, TriangleAlert, X } from 'lucide-react';
import { expired, labels, sortAccounts, statusOf, summarize } from '../shared/usage.cjs';
import type { Account, Provider, UiState } from './types';
import { shortWindow, UsageRings } from './usage-rings';
import { demoAccounts } from './demo';
import claudeLogo from './assets/claude.png';
import chatgptWhite from './assets/chatgpt-white.svg';
import chatgptBlack from './assets/chatgpt-black.svg';
import './style.css';
import './usage-rings.css';

const names = { claude: 'Claude Code', codex: 'Codex' };
const isPopup = new URLSearchParams(location.search).get('view') === 'popup';
document.title = isPopup ? 'UDV · Resumo' : 'UDV · Contas';
const api = window.udv;
const initialUi: UiState = { theme: 'system', reduceTransparency: false, dark: matchMedia('(prefers-color-scheme: dark)').matches,
  reduced: false, highContrast: false, platform: navigator.platform.startsWith('Mac') ? 'darwin' : 'win32', material: 'solid', pinned: false, version: '0.1.0' };
function Brand({ provider }: { provider: Provider }) {
  return <span className={`provider-icon ${provider}`} aria-hidden="true">{provider === 'claude'
    ? <img src={claudeLogo} alt="" /> : <><img className="logo-dark" src={chatgptWhite} alt="" /><img className="logo-light" src={chatgptBlack} alt="" /></>}</span>;
}
function age(timestamp: number | null, now: number) {
  if (!timestamp) return '';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  return minutes < 1 ? 'agora' : minutes < 60 ? `há ${minutes} min` : minutes < 1440 ? `há ${Math.floor(minutes / 60)} h` : `há ${Math.floor(minutes / 1440)} d`;
}
type Action = 'refresh' | 'connect' | 'cancel' | 'remove' | 'claude' | 'favorite' | 'rename';
function AccountRow({ account: a, now, open, toggle, busy, act }: { account: Account; now: number; open: boolean; toggle: () => void; busy: boolean; act: (action: Action, account: Account, value?: string) => void }) {
  const state = statusOf(a, now);
  const [label, setLabel] = useState(a.label);
  useEffect(() => setLabel(a.label), [a.label]);
  const uncertain = !['ok', 'near', 'exhausted'].includes(state);
  const hiddenReadings = ['disconnected', 'connecting'].includes(state);
  const detailId = `detail-${a.id}`;
  let hint = '';
  if (state === 'unknown') hint = a.provider === 'claude' ? 'O UDV vai buscar seus limites automaticamente, sem enviar mensagens ao Claude.' : 'O Codex ainda não informou os limites desta conta.';
  if (state === 'disconnected') hint = 'Conecte a conta para acompanhar seus limites.';
  if (state === 'connecting') hint = a.provider === 'claude' ? 'Conclua o login no terminal.' : 'Conclua o login no navegador.';
  if (state === 'stale' || state === 'expired') hint = 'Atualize para consultar os limites atuais.';
  if (state === 'error') hint = a.windows.length ? 'Estes são os últimos dados recebidos. Confira a conexão da conta.' : 'Verifique a conexão desta conta.';
  return <article className={`account-row ${open ? 'expanded' : ''}`} data-status={state} data-provider={a.provider}>
    <div className="account-main">
      <button className="account-head" onClick={toggle} aria-expanded={open} aria-controls={detailId}>
        <Brand provider={a.provider} /><span className="account-identity"><span className="account-title"><b>{a.label}</b>{a.favorite && <Star size={11} fill="currentColor" className="favorite" aria-label="Favorita" />}
          {state !== 'ok' && <span className={`state-tag ${state}`}>{state === 'near' ? <TriangleAlert size={10} /> : state === 'exhausted' ? <CircleAlert size={10} /> : null}{labels[state]}</span>}</span>
          <span className="provider-label">{names[a.provider]}{a.plan ? `, plano ${a.plan}` : ''}</span></span>
        <span className="reading-age" title={a.updatedAt ? new Date(a.updatedAt).toLocaleString('pt-BR') : 'Nenhuma leitura disponível'}>{age(a.updatedAt, now)}</span><ChevronDown size={13} className="chevron" />
      </button>
      <div className="account-windows">{!hiddenReadings && <UsageRings windows={a.windows} provider={a.provider} now={now} uncertain={uncertain} />}
        {hint && <div className="account-hint"><span>{hint}</span>{a.provider === 'claude' && ['unknown', 'stale', 'expired'].includes(state) && <button disabled={busy} onClick={() => act('refresh', a)}>Atualizar</button>}
          {state === 'disconnected' && <button disabled={busy} onClick={() => act('connect', a)}>Conectar</button>}{state === 'connecting' && <button disabled={busy} onClick={() => act('cancel', a)}>Cancelar</button>}</div>}
      </div>
    </div>
    {open && <div className="account-detail" id={detailId}>
      <dl><dt>Conta</dt><dd>{a.email || 'A conta ainda não informou o e-mail'}</dd><dt>Última leitura</dt><dd>{a.updatedAt ? `${new Date(a.updatedAt).toLocaleString('pt-BR')} (${age(a.updatedAt, now)})` : 'Nenhuma leitura recebida'}</dd>
        {!hiddenReadings && a.windows.map(w => <React.Fragment key={w.id}><dt>{shortWindow(w)}</dt><dd>{expired(w, now) ? 'O prazo de renovação passou. Falta confirmar os novos limites.' : `${Math.round(w.usedPercent)}% usado, ${Math.round(100 - w.usedPercent)}% restante${uncertain ? ' na última leitura' : ''}.`}</dd></React.Fragment>)}
        <dt>Fonte</dt><dd>{a.provider === 'claude' ? a.usageSource === 'statusline' ? 'Leitura durante o uso do Claude. A consulta automática de uso continua ativa.' : 'Claude Code: consulta automática de uso a cada 20 min, sem enviar mensagens.' : 'Codex CLI: consulta a cada minuto.'}</dd>
        {a.provider === 'claude' && a.nextQueryAt != null && <><dt>Próxima consulta</dt><dd>{new Date(a.nextQueryAt).toLocaleString('pt-BR')}</dd></>}
        {a.resetCredits != null && a.resetCredits > 0 && <><dt>Renovações extras</dt><dd>{a.resetCredits} disponíveis</dd></>}
      </dl>
      {a.error && <p className="account-error" role="alert">{a.error}</p>}
      <div className="detail-actions"><button disabled={busy} onClick={() => act('favorite', a)}><Star size={13} fill={a.favorite ? 'currentColor' : 'none'} />{a.favorite ? 'Remover dos favoritos' : 'Favoritar'}</button>
        {a.provider === 'claude' && <button disabled={busy} onClick={() => act('claude', a)}>Abrir Claude</button>}
        {a.status !== 'connecting' && <button disabled={busy} onClick={() => act('connect', a)}>{a.status === 'disconnected' ? 'Conectar' : 'Reconectar'}</button>}
        <button disabled={busy} onClick={() => act('refresh', a)}>Atualizar conta</button>
        {!isPopup && <button className="danger" disabled={busy} onClick={() => act('remove', a)}>Remover conta</button>}
      </div>
      {!isPopup && <form className="rename-form" onSubmit={e => { e.preventDefault(); act('rename', a, label); }}><label>Nome da conta<input required maxLength={60} value={label} onChange={e => setLabel(e.target.value)} /></label><button disabled={busy || !label.trim() || label === a.label}>Salvar nome</button></form>}
    </div>}
  </article>;
}
function AddAccount({ close, add }: { close: () => void; add: (provider: Provider, label: string) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [provider, setProvider] = useState<Provider>('claude'); const [label, setLabel] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  return <dialog className="add-dialog" ref={dialog} onCancel={close} onClick={e => { if (e.target === dialog.current) close(); }}><form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await add(provider, label.trim()); close(); } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível adicionar a conta.'); } finally { setBusy(false); } }}>
    <header><h2>Adicionar conta</h2><button type="button" className="icon-button" aria-label="Fechar" onClick={close}><X size={18} /></button></header>
    <p>Dê um nome à conta e faça login. Você pode adicionar quantas precisar.</p><fieldset><legend>Qual IA você usa?</legend><div className="provider-choices">{(['claude', 'codex'] as Provider[]).map(p => <button type="button" key={p} aria-pressed={provider === p} onClick={() => setProvider(p)}><Brand provider={p} />{p === 'claude' ? 'Claude' : 'Codex'}</button>)}</div></fieldset>
    <label className="form-field">Nome da conta<input autoFocus required maxLength={60} value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex.: Pessoal ou Trabalho" /></label>
    <p className="form-note"><ShieldCheck size={16} /><span>{provider === 'claude' ? 'Vamos abrir um terminal para você entrar no Claude. Depois do login, os limites aparecem aqui.' : 'Entre com sua conta do ChatGPT no navegador. Confira se é a conta que você quer acompanhar.'}</span></p>
    {error && <p className="error-message" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" onClick={close}>Cancelar</button><button className="primary" disabled={!api || busy || !label.trim()}>{busy ? 'Adicionando…' : 'Adicionar e conectar'}</button></div>
  </form></dialog>;
}
function Preferences({ ui, update }: { ui: UiState; update: (patch: Partial<UiState>) => void }) {
  const materialLabels = { solid: 'Fundo sólido', acrylic: 'Acrylic do Windows', mica: 'Mica do Windows', vibrancy: 'Vibrancy do macOS', 'liquid-glass': 'Liquid Glass do macOS' };
  return <section className="preferences" aria-label="Aparência"><label>Tema<select aria-label="Tema" value={ui.theme} onChange={e => update({ theme: e.target.value as UiState['theme'] })}><option value="system">Seguir o sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label>
    <label className="checkbox-label"><input type="checkbox" checked={ui.reduceTransparency} onChange={e => update({ reduceTransparency: e.target.checked })} />Reduzir transparência</label>
    <span className="appearance-note">{materialLabels[ui.material]}{ui.reduced && !ui.reduceTransparency ? ' · acessibilidade do sistema' : ''}</span>
    <p>Ao fechar esta janela, o UDV continua junto ao relógio. Para encerrar, clique com o botão direito no ícone e escolha “Sair do UDV”.</p></section>;
}
function App() {
  const [accounts, setAccounts] = useState<Account[]>([]); const [ui, setUi] = useState<UiState>(initialUi);
  const [expanded, setExpanded] = useState<string | null>(null); const [modal, setModal] = useState(false); const [prefs, setPrefs] = useState(false);
  const [filter, setFilter] = useState<'all' | Provider>('all'); const [search, setSearch] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [now, setNow] = useState(Date.now());
  const [demo, setDemo] = useState(() => localStorage.getItem('udv:demo') === 'true' || new URLSearchParams(location.search).get('demo') === '1');
  const [examples, setExamples] = useState<Account[]>(demoAccounts);
  const top = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null), footer = useRef<HTMLElement>(null), list = useRef<HTMLDivElement>(null);
  const lastAddRequest = useRef(0);
  const focusSummary = () => requestAnimationFrame(() => (inner.current?.querySelector<HTMLButtonElement>('.account-head, .empty-add') || top.current?.querySelector<HTMLButtonElement>('button'))?.focus());
  useEffect(() => {
    if (!api) return;
    const load = () => { api.list().then(setAccounts).catch(() => setError('Não foi possível carregar as contas locais.')); };
    const appearance = () => { api.ui().then(state => { setUi(state); if (!isPopup && state.addRequest && state.addRequest > lastAddRequest.current) { lastAddRequest.current = state.addRequest; setModal(true); } }).catch(() => setError('Não foi possível carregar as preferências.')); };
    load(); appearance();
    const cleanups = [api.onChange(load), api.onUiChange(appearance), api.onAddAccount(() => setModal(true)), api.onFocus(focusSummary)];
    return () => cleanups.forEach(clean => clean());
  }, []);
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(tick); }, []);
  useEffect(() => { const handler = (e: StorageEvent) => { if (e.key === 'udv:demo') setDemo(e.newValue === 'true'); }; window.addEventListener('storage', handler); return () => window.removeEventListener('storage', handler); }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 7000); return () => clearTimeout(timer); }, [notice]);
  useLayoutEffect(() => {
    if (!isPopup || !api) return;
    const measure = () => { const height = (top.current?.offsetHeight || 0) + (inner.current?.offsetHeight || 0) + (footer.current?.offsetHeight || 0) + 2; void api.resizeSummary(height).catch(() => {}); };
    const observer = new ResizeObserver(measure); [top.current, inner.current, footer.current].forEach(el => { if (el) observer.observe(el); }); measure(); return () => observer.disconnect();
  }, []);
  async function perform(task: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await task(); if (api) setAccounts(await api.list()); }
    catch (error) { setError(error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : 'Não foi possível concluir a ação.'); }
    finally { setBusy(false); }
  }
  function toggleDemo(value: boolean) { localStorage.setItem('udv:demo', String(value)); setDemo(value); setExpanded(null); setNotice(''); }
  function act(action: Action, account: Account, value?: string) {
    if (demo) {
      if (action === 'favorite') setExamples(rows => rows.map(a => a.id === account.id ? { ...a, favorite: !a.favorite } : a));
      else setNotice('Estas contas são de exemplo. Saia da demonstração para usar as suas.');
      return;
    }
    if (!api) { setNotice('Abra o aplicativo desktop para conectar e gerenciar contas.'); return; }
    void perform(async () => {
      if (action === 'refresh') await api.refresh(account.id);
      if (action === 'connect') await api.connect(account.id);
      if (action === 'cancel') await api.cancel(account.id);
      if (action === 'remove') await api.remove(account.id);
      if (action === 'claude') await api.openClaude(account.id);
      if (action === 'favorite') await api.update(account.id, { favorite: !account.favorite });
      if (action === 'rename') await api.update(account.id, { label: value });
    });
  }
  function add() {
    if (demo) { setNotice('Saia da demonstração para adicionar uma conta real.'); return; }
    if (isPopup && api) void api.openPanel({ add: true }); else setModal(true);
  }
  function panel() { if (api) void api.openPanel(); else location.search = '?view=panel' + (demo ? '&demo=1' : ''); }
  function refresh() {
    if (demo) { setNotice('Estes dados são de exemplo. Suas contas não foram consultadas.'); return; }
    if (api) void perform(async () => { await api.refresh(); setNotice('Consulta concluída. Confira o horário da última leitura em cada conta. O Claude pode aguardar o intervalo mínimo antes de consultar de novo.'); });
  }
  async function updateUi(patch: Partial<UiState>) {
    if (api) {
      setUi(current => ({ ...current, ...patch }));
      await perform(async () => { try { setUi(await api.settings(patch)); } catch (error) { setUi(await api.ui()); throw error; } });
    }
    else setUi(current => ({ ...current, ...patch, dark: patch.theme ? patch.theme === 'dark' || patch.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches : current.dark, reduced: patch.reduceTransparency ?? current.reduced }));
  }
  const shown = sortAccounts(demo ? examples : accounts, now);
  const filtered = shown.filter(a => (filter === 'all' || a.provider === filter) && `${a.label} ${a.email || ''} ${names[a.provider]}`.toLowerCase().includes(search.toLowerCase()));
  const summary = summarize(shown, now);
  const rows = isPopup ? shown : filtered;
  const keyDown = (e: React.KeyboardEvent) => {
    if (!isPopup) return;
    if (e.key === 'Escape') { e.preventDefault(); if (api) void api.hideSummary(); return; }
    const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('.account-head') || [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index !== -1 && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length; buttons[next]?.focus();
    }
    if (e.key === 'Tab') {
      const focusable = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(el => el.offsetParent !== null);
      if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable.at(-1)?.focus(); }
      if (!e.shiftKey && document.activeElement === focusable.at(-1)) { e.preventDefault(); focusable[0]?.focus(); }
    }
  };
  return <div className={`surface ${isPopup ? 'popup' : 'panel'} ${ui.platform === 'darwin' ? 'mac' : 'windows'} ${ui.dark ? 'dark' : 'light'} ${ui.reduced ? 'reduced' : ''} ${ui.highContrast ? 'high-contrast' : ''}`}
    data-material={ui.material} onKeyDown={keyDown}>
    <div ref={top} className="surface-top">{isPopup ? <header className="popup-header"><span className="summary" role="status">{summary.text}</span><button className="icon-button pin-button" aria-pressed={ui.pinned} aria-label={ui.pinned ? 'Desafixar resumo' : 'Fixar resumo aberto'} onClick={() => { if (api) void api.pin(!ui.pinned); else setUi({ ...ui, pinned: !ui.pinned }); }}>{ui.pinned ? <PinOff size={14} /> : <Pin size={14} />}</button></header>
      : <><header className="panel-header"><div><h1>UDV</h1><span className="summary">{summary.text}</span></div><div className="panel-header-actions"><button onClick={() => { if (api) void api.showSummary(); else location.search = '?view=popup' + (demo ? '&demo=1' : ''); }}><ArrowLeft size={14} />Abrir resumo</button><button className="icon-button" aria-label="Aparência e ajuda" aria-expanded={prefs} onClick={() => setPrefs(!prefs)}><Settings2 size={17} /></button></div></header>
      <div className="panel-toolbar"><div className="filter-tabs" aria-label="Filtrar provedor">{(['all', 'claude', 'codex'] as const).map(p => <button key={p} aria-pressed={filter === p} onClick={() => setFilter(p)}>{p === 'all' ? 'Todas' : p === 'claude' ? 'Claude' : 'Codex'} <small>{shown.filter(a => p === 'all' || a.provider === p).length}</small></button>)}</div><label className="search"><Search size={14} /><input aria-label="Buscar conta" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conta" /></label><button disabled={busy || !shown.length} onClick={refresh}><RefreshCw size={14} className={busy ? 'spinning' : ''} />Atualizar</button><button onClick={add}><Plus size={14} />Adicionar conta</button></div>{prefs && <Preferences ui={ui} update={updateUi} />}</>}
      {demo && <div className="demo-banner"><span>Demonstração · dados fictícios</span><button onClick={() => toggleDemo(false)}>Sair da demonstração</button></div>}
      {error && <div className="error-message" role="alert"><span>{error}</span><button className="icon-button" aria-label="Fechar erro" onClick={() => setError('')}><X size={13} /></button></div>}
      {notice && <div className="notice" role="status">{notice}</div>}
    </div>
    <div className="list-scroll" ref={list}><div className="list-inner" ref={inner}>{rows.length ? rows.map(a => <AccountRow key={a.id} account={a} now={now} open={expanded === a.id} toggle={() => setExpanded(expanded === a.id ? null : a.id)} busy={busy} act={act} />)
      : <div className="empty-state">{shown.length ? <><Search size={22} /><h2>Nenhuma conta encontrada</h2><p>Busque por outro nome ou escolha outra IA.</p><button onClick={() => { setSearch(''); setFilter('all'); }}>Limpar filtros</button></>
      : <><div className="empty-logos"><Brand provider="claude" /><Brand provider="codex" /></div><h2>Nenhuma conta conectada</h2><p>Veja quanto ainda pode usar no Claude e no Codex, e quando seus limites renovam. Adicione uma conta para começar.</p><button className="primary empty-add" onClick={add}><Plus size={14} />Adicionar conta</button><button className="demo-link" onClick={() => toggleDemo(true)}>Explorar com dados de exemplo</button></>}</div>}</div></div>
    {isPopup ? <footer className="popup-footer" ref={footer}><button onClick={refresh} disabled={busy || !shown.length} title="Busca os limites de cada conta, respeitando o intervalo entre consultas"><RefreshCw size={13} className={busy ? 'spinning' : ''} />Atualizar</button><button onClick={add}><Plus size={14} />Adicionar conta</button><button onClick={panel}><LayoutPanelTop size={13} />Abrir painel</button></footer>
    : <footer className="panel-footer"><span><ShieldCheck size={13} />Suas contas ficam neste computador</span><span>UDV {ui.version}</span></footer>}
    {modal && <AddAccount close={() => setModal(false)} add={async (provider, label) => { if (!api) throw new Error('Abra o aplicativo desktop para conectar contas reais.'); const a = await api.add(provider, label); setAccounts(await api.list()); act('connect', a); }} />}
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
