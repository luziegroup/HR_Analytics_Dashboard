import { KPI_DEFINITIONS } from '@/config/kpiDefinitions';
import { SCORE_CAP_PCT } from '@/config/team';
import type { KpiSubmission } from '@/types/submission';

export interface EmployeeMonthScore {
  employeeId: string;
  totalWeight: number;
  /** Nilai KPI (0 - 1.2) dari kiriman yang sudah divalidasi saja. */
  validatedScore: number;
  /** Nilai bila semua kiriman yang menunggu validasi disetujui apa adanya. */
  projectedScore: number;
  kpiCount: number;
  validatedCount: number;
  submittedCount: number;
  rejectedCount: number;
}

function cappedFraction(pct: number): number {
  return Math.min(Math.max(pct, 0), SCORE_CAP_PCT) / 100;
}

export function scoreEmployeeMonth(
  employeeId: string,
  submissions: KpiSubmission[],
): EmployeeMonthScore {
  const defs = KPI_DEFINITIONS.filter((d) => d.employeeId === employeeId);
  const byKpi = new Map(submissions.map((s) => [s.kpiId, s]));
  const result: EmployeeMonthScore = {
    employeeId,
    totalWeight: defs.reduce((s, d) => s + d.weight, 0),
    validatedScore: 0,
    projectedScore: 0,
    kpiCount: defs.length,
    validatedCount: 0,
    submittedCount: 0,
    rejectedCount: 0,
  };

  for (const def of defs) {
    const sub = byKpi.get(def.id);
    if (!sub) continue;
    if (sub.status === 'Validated') {
      const v = def.weight * cappedFraction(sub.validatedScore ?? sub.claimedScore);
      result.validatedScore += v;
      result.projectedScore += v;
      result.validatedCount++;
    } else if (sub.status === 'Submitted') {
      result.projectedScore += def.weight * cappedFraction(sub.claimedScore);
      result.submittedCount++;
    } else if (sub.status === 'Rejected') {
      result.rejectedCount++;
    }
  }
  return result;
}

export function categoryForScore(score: number): string {
  if (score >= 1) return 'Sangat baik';
  if (score >= 0.85) return 'Baik';
  if (score >= 0.7) return 'Cukup';
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
