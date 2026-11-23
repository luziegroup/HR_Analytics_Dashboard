import type {
  ComputedEmployeeScore,
  ComputedKpi,
  MonthlyScheduleConfig,
  MonthlySummaryReport,
} from '@/types/kpi';
import {
  computeDepartmentPerformance,
  computeExecutiveKpis,
  detectDownwardTrendKpis,
} from '@/utils/kpiAnalytics';

export function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}

export function getNextFirstOfMonthRun(runHour: number, now = new Date()): Date {
  const candidate = new Date(now.getFullYear(), now.getMonth(), 1, runHour, 0, 0, 0);
  if (now >= candidate) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, runHour, 0, 0, 0);
  }
  return candidate;
}

export function buildMonthlySummaryReport(
  allScores: ComputedEmployeeScore[],
  allKpis: ComputedKpi[],
  options: {
    monthKey: string;
    monthLabel: string;
    trigger: MonthlySummaryReport['trigger'];
    scopeDepartment: string;
    generatedAt?: string;
    read?: boolean;
  },
): MonthlySummaryReport {
  const scopedScores =
    options.scopeDepartment === 'All'
      ? allScores
      : allScores.filter((s) => s.employee.department === options.scopeDepartment);
  const scopedKpis =
    options.scopeDepartment === 'All'
      ? allKpis
      : allKpis.filter((k) => k.department === options.scopeDepartment);

  const exec = computeExecutiveKpis(scopedScores, scopedKpis);
  const departments = computeDepartmentPerformance(scopedScores);
  const downward = detectDownwardTrendKpis(scopedKpis);

  const topDept = departments[0];
  const lowestDept = departments[departments.length - 1];

  return {
    id: `RPT-${options.monthKey}-${Date.now().toString(36)}`,
    monthKey: options.monthKey,
    monthLabel: options.monthLabel,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    trigger: options.trigger,
    scopeDepartment: options.scopeDepartment,
    avgAttainmentPct: exec.avgAttainment,
    onTrackRatePct: exec.onTrackRate,
    avgCompositeIndex: exec.avgCompositeIndex,
    totalKpis: exec.totalKpis,
    downwardAlertCount: downward.length,
    topDepartment: topDept
      ? `${topDept.department} (${topDept.avgAttainmentPct}%)`
      : '—',
    attentionDepartment: lowestDept
      ? `${lowestDept.department} (${lowestDept.avgAttainmentPct}%)`
      : '—',
    departments,
    downwardHighlights: downward.map((d) => ({
      kpiId: d.kpi.id,
      kpiTitle: d.kpi.title,
      owner: d.kpi.employeeName,
      department: d.kpi.department,
      dropPts: d.threeMonthChangePts,
      currentAttainmentPct: d.kpi.attainmentPct,
      severity: d.severity,
    })),
    read: options.read ?? false,
  };
}

export function createSeededMonthlyReports(
  allScores: ComputedEmployeeScore[],
  allKpis: ComputedKpi[],
  now = new Date(),
): MonthlySummaryReport[] {
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1, 9, 0, 0);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 9, 0, 0);

  const currentReport = buildMonthlySummaryReport(allScores, allKpis, {
    monthKey: formatMonthKey(currentMonthDate),
    monthLabel: formatMonthLabel(currentMonthDate),
    trigger: 'Scheduled (1st of Month)',
    scopeDepartment: 'All',
    generatedAt: currentMonthDate.toISOString(),
    read: false,
  });

  // Historical previous month snapshot for archive continuity
  const prevSnapshot = buildMonthlySummaryReport(allScores, allKpis, {
    monthKey: formatMonthKey(prevMonthDate),
    monthLabel: formatMonthLabel(prevMonthDate),
    trigger: 'Scheduled (1st of Month)',
    scopeDepartment: 'All',
    generatedAt: prevMonthDate.toISOString(),
    read: true,
  });

  const adjustedPrev: MonthlySummaryReport = {
    ...prevSnapshot,
    avgAttainmentPct: Number(Math.max(70, prevSnapshot.avgAttainmentPct - 1.4).toFixed(1)),
    avgCompositeIndex: Number(Math.max(65, prevSnapshot.avgCompositeIndex - 1.1).toFixed(1)),
    departments: prevSnapshot.departments.map((d) => ({
      ...d,
      avgAttainmentPct: Number(Math.max(60, d.avgAttainmentPct - 1.3).toFixed(1)),
    })),
  };

  return [currentReport, adjustedPrev];
}

export function shouldTriggerMonthlySchedule(
  config: MonthlyScheduleConfig,
  reports: MonthlySummaryReport[],
  now = new Date(),
): boolean {
  if (!config.enabled) return false;
  const currentKey = formatMonthKey(now);
  const alreadyGeneratedForMonth = reports.some(
    (r) => r.monthKey === currentKey && r.trigger === 'Scheduled (1st of Month)',
  );
  if (alreadyGeneratedForMonth) return false;

  // Trigger on the 1st once the configured hour arrives (or catch up if missed earlier this month)
  if (now.getDate() === 1) {
    return now.getHours() >= config.runHour;
  }
  return now.getDate() > 1;
}
