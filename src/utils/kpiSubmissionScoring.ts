import { KPI_DEFINITIONS } from '@/config/kpiDefinitions';
import { SCORE_CAP } from '@/config/team';
import type { KpiSubmission } from '@/types/submission';

export function realisasiRatio(target: number, actual: number): number | null {
  if (!Number.isFinite(target) || !Number.isFinite(actual) || target <= 0 || actual < 0) return null;
  return actual / target;
}

export interface EmployeeMonthScore {
  employeeId: string;
  totalWeight: number;
  /** Nilai KPI dari submission yang sudah divalidasi saja (0 - 1.2). */
  validatedScore: number;
  /** Nilai bila semua kiriman yang menunggu validasi juga disetujui. */
  projectedScore: number;
  kpiCount: number;
  validatedCount: number;
  submittedCount: number;
  rejectedCount: number;
}

export function scoreEmployeeMonth(
  employeeId: string,
  submissions: KpiSubmission[],
): EmployeeMonthScore {
  const defs = KPI_DEFINITIONS.filter((d) => d.employeeId === employeeId);
  const byKpi = new Map(submissions.map((s) => [s.kpiId, s]));
  let validatedScore = 0;
  let projectedScore = 0;
  let validatedCount = 0;
  let submittedCount = 0;
  let rejectedCount = 0;

  for (const def of defs) {
    const sub = byKpi.get(def.id);
    if (!sub) continue;
    const ratio = realisasiRatio(sub.target, sub.actual);
    const capped = ratio === null ? 0 : Math.min(ratio, SCORE_CAP);
    if (sub.status === 'Validated') {
      validatedScore += def.weight * capped;
      projectedScore += def.weight * capped;
      validatedCount++;
    } else if (sub.status === 'Submitted') {
      projectedScore += def.weight * capped;
      submittedCount++;
    } else if (sub.status === 'Rejected') {
      rejectedCount++;
    }
  }

  return {
    employeeId,
    totalWeight: defs.reduce((s, d) => s + d.weight, 0),
    validatedScore,
    projectedScore,
    kpiCount: defs.length,
    validatedCount,
    submittedCount,
    rejectedCount,
  };
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
