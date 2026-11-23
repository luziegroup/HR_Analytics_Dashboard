import type { KpiSubmission } from '@/types/submission';

/**
 * Penyimpanan lokal (localStorage) untuk tahap pengembangan sistem.
 * Data hanya ada di browser ini. Antarmuka fungsi sengaja dibuat sederhana
 * agar nanti mudah diganti ke database bersama.
 */
const STORAGE_KEY = 'kpi-submissions-v2';
const SESSION_KEY = 'kpi-session-user';
const listeners = new Set<() => void>();

export function submissionId(monthKey: string, kpiId: string): string {
  return `${monthKey}_${kpiId}`;
}

export function loadAllSubmissions(): KpiSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as KpiSubmission[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: KpiSubmission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((fn) => fn());
}

export function subscribeSubmissions(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

export function saveSubmission(sub: KpiSubmission): void {
  const items = loadAllSubmissions().filter((s) => s.id !== sub.id);
  items.push(sub);
  writeAll(items);
}

export function decideSubmission(
  sub: KpiSubmission,
  decision: 'Validated' | 'Rejected',
  leaderName: string,
  leaderNote: string,
  validatedScore: number,
): void {
  const now = new Date().toISOString();
  const updated: KpiSubmission = {
    ...sub,
    status: decision,
    validatedScore: decision === 'Validated' ? validatedScore : undefined,
    validatedBy: leaderName,
    validatedAt: now,
    leaderNote,
    updatedAt: now,
  };
  saveSubmission(updated);
}

export function clearMonth(monthKey: string): void {
  writeAll(loadAllSubmissions().filter((s) => s.monthKey !== monthKey));
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(id: string | null): void {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}
