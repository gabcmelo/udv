export type Provider = 'claude' | 'codex';
export interface UsageWindow { id: string; label: string; usedPercent: number; resetsAt: number | null; durationMinutes: number | null; expired: boolean }
export interface Account { id: string; provider: Provider; label: string; createdAt: number; favorite?: boolean; status: 'connected' | 'disconnected' | 'connecting' | 'error'; windows: UsageWindow[]; updatedAt: number | null; plan?: string; email?: string; error?: string | null; resetCredits?: number | null; usageSource?: 'usage' | 'statusline'; nextQueryAt?: number | null }
export interface Preferences { theme: 'system' | 'dark' | 'light'; reduceTransparency: boolean }
export interface UiState extends Preferences { dark: boolean; reduced: boolean; highContrast: boolean; platform: string; material: 'solid' | 'acrylic' | 'mica' | 'vibrancy' | 'liquid-glass'; pinned: boolean; version: string; addRequest?: number }
export interface Bridge {
  list(): Promise<Account[]>;
  add(provider: Provider, label: string): Promise<Account>;
  connect(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  refresh(id?: string): Promise<void>;
  remove(id: string): Promise<void>;
  openClaude(id: string): Promise<void>;
  update(id: string, patch: { favorite?: boolean; label?: string }): Promise<void>;
  ui(): Promise<UiState>;
  settings(patch: Partial<Preferences>): Promise<UiState>;
  openPanel(options?: { add?: boolean }): Promise<void>;
  showSummary(): Promise<void>;
  hideSummary(): Promise<void>;
  pin(value: boolean): Promise<void>;
  resizeSummary(height: number): Promise<void>;
  onUiChange(callback: () => void): () => void;
  onAddAccount(callback: () => void): () => void;
  onFocus(callback: () => void): () => void;
  onChange(callback: () => void): () => void;
}
declare global { interface Window { udv?: Bridge } }
