import { SCORE_CAP_PCT } from '@/config/team';
import type { KpiSubmission } from '@/types/submission';

/** Nilai resmi (persen, dibatasi 0 - 120). Hanya ada jika sudah divalidasi leader. */
export function officialScorePct(sub?: KpiSubmission): number | null {
  if (!sub || sub.status !== 'Validated') return null;
  const v = sub.validatedScore ?? sub.claimedScore;
  return Math.min(Math.max(v, 0), SCORE_CAP_PCT);
}

export function categoryForScorePct(pct: number): string {
  if (pct >= 100) return 'Sangat baik';
  if (pct >= 85) return 'Baik';
  if (pct >= 70) return 'Cukup';
  return 'Perlu perbaikan';
}

export function isValidEvidenceUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function parseScore(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > SCORE_CAP_PCT) return null;
  return n;
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob(['\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
