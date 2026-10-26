import type { Account } from './types';
export function demoAccounts(): Account[] {
  const now = Date.now();
  return [
    { id: 'demo-1', favorite: true, provider: 'claude', label: 'Pessoal', email: 'pessoal@exemplo.com', plan: 'Max', status: 'connected', createdAt: now, updatedAt: now - 90000, windows: [
      { id: 'five', label: 'Janela de 5 horas', usedPercent: 38, resetsAt: now + 7200000, durationMinutes: 300, expired: false },
      { id: 'week', label: 'Semanal', usedPercent: 12, resetsAt: now + 252000000, durationMinutes: 10080, expired: false }] },
    { id: 'demo-2', favorite: true, provider: 'codex', label: 'Trabalho', email: 'trabalho@exemplo.com', plan: 'Plus', status: 'connected', createdAt: now + 1, updatedAt: now - 12000, resetCredits: 2, windows: [
      { id: 'five', label: 'Janela de 5 horas', usedPercent: 46, resetsAt: now + 5100000, durationMinutes: 300, expired: false },
      { id: 'week', label: 'Semanal', usedPercent: 21, resetsAt: now + 172800000, durationMinutes: 10080, expired: false }] },
    { id: 'demo-3', provider: 'codex', label: 'Projeto B', email: 'projetob@exemplo.com', plan: 'Pro', status: 'connected', createdAt: now + 2, updatedAt: now - 12000, windows: [
      { id: 'five', label: 'Janela de 5 horas', usedPercent: 9, resetsAt: now + 14400000, durationMinutes: 300, expired: false },
      { id: 'week', label: 'Semanal', usedPercent: 33, resetsAt: now + 432000000, durationMinutes: 10080, expired: false }] },
    { id: 'demo-4', provider: 'claude', label: 'Estudos', email: 'estudos@exemplo.com', plan: 'Pro', status: 'connected', createdAt: now + 3, updatedAt: now - 18 * 60000, windows: [
      { id: 'five', label: 'Janela de 5 horas', usedPercent: 22, resetsAt: now + 12000000, durationMinutes: 300, expired: false }] }
  ];
}
