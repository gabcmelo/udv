import type { Account, UsageWindow } from '../src/types';
export type ReadingStatus = 'exhausted' | 'near' | 'disconnected' | 'connecting' | 'error' | 'expired' | 'stale' | 'unknown' | 'ok';
export const STALE_MS: number;
export function expired(window: UsageWindow, now?: number): boolean;
export function statusOf(account: Account, now?: number): ReadingStatus;
export const labels: Record<ReadingStatus, string>;
export function sortAccounts(accounts: Account[], now?: number): Account[];
export function summarize(accounts: Account[], now?: number): { text: string; badge: 'exhausted' | 'near' | 'unknown' | 'ok' };
