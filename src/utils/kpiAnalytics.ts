import {
  KPI_3M_HISTORY_SEP_OCT,
  MONTHLY_PERFORMANCE_HISTORY,
  QUARTERLY_PERFORMANCE_HISTORY,
} from '@/data/kpiDataset';
import type {
  ComputedEmployeeScore,
  ComputedKpi,
  DepartmentPerformanceSummary,
  EmployeePerformance,
  KpiMetric,
  KpiStatus,
} from '@/types/kpi';

export function computeKpiAttainment(kpi: KpiMetric): number {
  if (kpi.target <= 0) return 0;
  let ratio: number;
  if (kpi.inverse) {
    ratio = kpi.actual <= 0 ? 1.25 : kpi.target / kpi.actual;
  } else {
    ratio = kpi.actual / kpi.target;
  }
  const pct = Math.min(130, Math.max(0, ratio * 100));
  return Number(pct.toFixed(1));
}

export function classifyKpiStatus(attainmentPct: number): KpiStatus {
  if (attainmentPct >= 105) return 'Exceeded';
  if (attainmentPct >= 85) return 'On Track';
  if (attainmentPct >= 70) return 'At Risk';
  return 'Off Track';
}

export function enrichKpi(kpi: KpiMetric): ComputedKpi {
  const attainmentPct = computeKpiAttainment(kpi);
  return {
    ...kpi,
    attainmentPct,
    status: classifyKpiStatus(attainmentPct),
  };
}

export function getNineBoxPlacement(
  attainmentPct: number,
  competencyScore: number,
): { key: string; label: string } {
  const x = attainmentPct >= 100 ? 'high' : attainmentPct >= 75 ? 'mid' : 'low';
  const y = competencyScore >= 4.3 ? 'high' : competencyScore >= 3.5 ? 'mid' : 'low';
  const key = `${y}-${x}`;

  const labels: Record<string, string> = {
    'high-high': 'Kinerja Bintang',
    'high-mid': 'Potensi Tinggi',
    'high-low': 'Ketidaksesuaian Kapabilitas',
    'mid-high': 'Berdampak Tinggi',
    'mid-mid': 'Kontributor Inti',
    'mid-low': 'Di Bawah Ekspektasi',
    'low-high': 'Berorientasi Hasil (Pembinaan)',
    'low-mid': 'Dalam Pengembangan',
    'low-low': 'Intervensi Kinerja',
  };

  return { key, label: labels[key] ?? 'Kontributor Inti' };
}

export function computeEmployeeScores(
  employees: EmployeePerformance[],
  kpis: KpiMetric[],
): ComputedEmployeeScore[] {
  const kpisByEmp = new Map<string, ComputedKpi[]>();
  for (const raw of kpis) {
    const computed = enrichKpi(raw);
    const list = kpisByEmp.get(raw.employeeId) ?? [];
    list.push(computed);
    kpisByEmp.set(raw.employeeId, list);
  }

  return employees.map((emp) => {
    const empKpis = kpisByEmp.get(emp.id) ?? [];
    const totalWeight = empKpis.reduce((s, k) => s + k.weight, 0);

    const weightedAttainmentPct =
      empKpis.length === 0
        ? 0
        : totalWeight > 0
          ? Number(
              (
                empKpis.reduce((s, k) => s + k.attainmentPct * k.weight, 0) /
                totalWeight
              ).toFixed(1),
            )
          : Number(
              (
                empKpis.reduce((s, k) => s + k.attainmentPct, 0) / empKpis.length
              ).toFixed(1),
            );

    const normalizedKpi = Math.min(100, (weightedAttainmentPct / 110) * 100);
    const normalizedComp = (emp.competencyScore / 5) * 100;
    const compositeIndex = Number((normalizedKpi * 0.7 + normalizedComp * 0.3).toFixed(1));
    const finalRating = Number(Math.min(5, Math.max(1, (compositeIndex / 100) * 5)).toFixed(2));
    const overallStatus = classifyKpiStatus(weightedAttainmentPct);
    const nineBox = getNineBoxPlacement(weightedAttainmentPct, emp.competencyScore);

    return {
      employee: emp,
      kpis: empKpis,
      kpiCount: empKpis.length,
      weightedAttainmentPct,
      compositeIndex,
      finalRating,
      overallStatus,
      nineBoxKey: nineBox.key,
      nineBoxLabel: nineBox.label,
    };
  });
}

export function computeExecutiveKpis(
  scores: ComputedEmployeeScore[],
  kpis: ComputedKpi[],
) {
  const avgAttainment =
    kpis.length > 0
      ? Number(
          (kpis.reduce((s, k) => s + k.attainmentPct, 0) / kpis.length).toFixed(1),
        )
      : 0;
  const onTrackKpis = kpis.filter(
    (k) => k.status === 'Exceeded' || k.status === 'On Track',
  ).length;
  const onTrackRate =
    kpis.length > 0 ? Number(((onTrackKpis / kpis.length) * 100).toFixed(1)) : 0;

  const avgCompositeIndex =
    scores.length > 0
      ? Number(
          (scores.reduce((s, e) => s + e.compositeIndex, 0) / scores.length).toFixed(1),
        )
      : 0;

  const avgFinalRating =
    scores.length > 0
      ? Number(
          (scores.reduce((s, e) => s + e.finalRating, 0) / scores.length).toFixed(2),
        )
      : 0;

  const coachingNeeded = scores.filter((s) => s.weightedAttainmentPct < 80).length;
  const calibratedCount = scores.filter(
    (s) => s.employee.reviewStatus === 'Calibrated',
  ).length;

  return {
    totalKpis: kpis.length,
    onTrackKpis,
    avgAttainment,
    onTrackRate,
    avgCompositeIndex,
    avgFinalRating,
    coachingNeeded,
    calibratedCount,
    totalEmployees: scores.length,
  };
}

export function computeDepartmentPerformance(
  scores: ComputedEmployeeScore[],
): DepartmentPerformanceSummary[] {
  const map = new Map<string, ComputedEmployeeScore[]>();
  for (const s of scores) {
    const arr = map.get(s.employee.department) ?? [];
    arr.push(s);
    map.set(s.employee.department, arr);
  }

  return Array.from(map.entries())
    .map(([department, group]) => {
      const kpiList = group.flatMap((g) => g.kpis);
      const onTrack = kpiList.filter(
        (k) => k.status === 'Exceeded' || k.status === 'On Track',
      ).length;
      return {
        department,
        employeeCount: group.length,
        kpiCount: kpiList.length,
        avgAttainmentPct: Number(
          (
            group.reduce((s, g) => s + g.weightedAttainmentPct, 0) / group.length
          ).toFixed(1),
        ),
        avgCompetency: Number(
          (
            group.reduce((s, g) => s + g.employee.competencyScore, 0) / group.length
          ).toFixed(2),
        ),
        avgCompositeIndex: Number(
          (group.reduce((s, g) => s + g.compositeIndex, 0) / group.length).toFixed(1),
        ),
        onTrackRatePct:
          kpiList.length > 0
            ? Number(((onTrack / kpiList.length) * 100).toFixed(1))
            : 0,
        coachingNeededCount: group.filter((g) => g.weightedAttainmentPct < 80).length,
      };
    })
    .sort((a, b) => b.avgAttainmentPct - a.avgAttainmentPct);
}

export function computeQuarterlyTrend(currentAvgAttainment: number, currentAvgComp: number) {
  return QUARTERLY_PERFORMANCE_HISTORY.map((pt, idx) =>
    idx === QUARTERLY_PERFORMANCE_HISTORY.length - 1
      ? {
          ...pt,
          attainment: currentAvgAttainment || pt.attainment,
          competency: currentAvgComp || pt.competency,
        }
      : pt,
  );
}

export interface MonthlyPerformancePoint {
  month: string;
  target: number;
  attainment: number;
  compositeIndex: number;
  momDelta: number | null;
}

export function computeMonthlyPerformanceTrend(
  currentAvgAttainment: number,
  currentCompositeIndex: number,
): MonthlyPerformancePoint[] {
  const baselineLatest =
    MONTHLY_PERFORMANCE_HISTORY[MONTHLY_PERFORMANCE_HISTORY.length - 1]?.attainment || 95.1;
  const scaleFactor =
    currentAvgAttainment > 0 ? currentAvgAttainment / baselineLatest : 1;

  const adjusted = MONTHLY_PERFORMANCE_HISTORY.map((pt, idx) => {
    const isLatest = idx === MONTHLY_PERFORMANCE_HISTORY.length - 1;
    const attainment = isLatest
      ? currentAvgAttainment || pt.attainment
      : Number((pt.attainment * scaleFactor).toFixed(1));
    const compositeIndex = isLatest
      ? currentCompositeIndex || pt.compositeIndex
      : Number(
          (
            pt.compositeIndex *
            (currentCompositeIndex > 0 ? currentCompositeIndex / pt.compositeIndex : 1) *
            0.2 +
            pt.compositeIndex * 0.8
          ).toFixed(1),
        );

    return {
      month: pt.month,
      target: pt.target,
      attainment,
      compositeIndex,
    };
  });

  return adjusted.map((pt, idx) => ({
    ...pt,
    momDelta:
      idx === 0
        ? null
        : Number((pt.attainment - adjusted[idx - 1].attainment).toFixed(1)),
  }));
}

export interface DownwardTrendKpi {
  kpi: ComputedKpi;
  series: [
    { month: string; value: number },
    { month: string; value: number },
    { month: string; value: number },
  ];
  threeMonthChangePts: number; // negative percentage-point change
  severity: 'Critical' | 'Warning';
}

export function detectDownwardTrendKpis(kpis: ComputedKpi[]): DownwardTrendKpi[] {
  const flagged: DownwardTrendKpi[] = [];

  for (const kpi of kpis) {
    const hist = KPI_3M_HISTORY_SEP_OCT[kpi.id];
    let sepVal: number;
    let octVal: number;

    if (hist) {
      [sepVal, octVal] = hist;
    } else if (kpi.attainmentPct < 78) {
      // Fallback trajectory for custom CSV KPIs flagging below-target performance
      sepVal = Number(Math.min(100, kpi.attainmentPct + 14).toFixed(1));
      octVal = Number(Math.min(100, kpi.attainmentPct + 7).toFixed(1));
    } else {
      continue;
    }

    const novVal = kpi.attainmentPct;
    const threeMonthChangePts = Number((novVal - sepVal).toFixed(1));
    const isConsistentDecline = sepVal > octVal && octVal > novVal;
    const isSignificantDrop = threeMonthChangePts <= -8;

    if (isConsistentDecline && isSignificantDrop) {
      const severity: DownwardTrendKpi['severity'] =
        threeMonthChangePts <= -15 || novVal < 70 ? 'Critical' : 'Warning';

      flagged.push({
        kpi,
        series: [
          { month: 'Sep', value: sepVal },
          { month: 'Okt', value: octVal },
          { month: 'Nov', value: novVal },
        ],
        threeMonthChangePts,
        severity,
      });
    }
  }

  return flagged.sort((a, b) => a.threeMonthChangePts - b.threeMonthChangePts);
}

export function formatKpiValue(val: number, unit: KpiMetric['unit']): string {
  if (unit === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  }
  if (unit === '%') return `${val}%`;
  if (unit === 'days') return `${val} hr`;
  if (unit === 'score') return val.toFixed(1);
  return new Intl.NumberFormat('id-ID').format(val);
}

export interface CorrelationMetricMeta {
  key: import('@/types/kpi').KpiCorrelationMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
}

export const KPI_CORRELATION_METRICS: CorrelationMetricMeta[] = [
  {
    key: 'satisfaction',
    label: 'Kepuasan Karyawan (%)',
    shortLabel: 'Kepuasan',
    unit: '%',
  },
  {
    key: 'output',
    label: 'Output Kinerja (%)',
    shortLabel: 'Output',
    unit: '%',
  },
  {
    key: 'quality',
    label: 'Pencapaian Kualitas (%)',
    shortLabel: 'Kualitas',
    unit: '%',
  },
  {
    key: 'efficiency',
    label: 'Pencapaian Efisiensi (%)',
    shortLabel: 'Efisiensi',
    unit: '%',
  },
  {
    key: 'growth',
    label: 'Pencapaian Pertumbuhan (%)',
    shortLabel: 'Pertumbuhan',
    unit: '%',
  },
  {
    key: 'overallAttainment',
    label: 'Total Pencapaian KPI (%)',
    shortLabel: 'Pencapaian KPI',
    unit: '%',
  },
  {
    key: 'competency',
    label: 'Skor Kompetensi (/ 5,0)',
    shortLabel: 'Kompetensi',
    unit: '',
  },
  {
    key: 'compositeIndex',
    label: 'Indeks Kinerja Komposit',
    shortLabel: 'Komposit',
    unit: '',
  },
];

export function getEmployeeSatisfactionPct(emp: EmployeePerformance): number {
  if (typeof emp.satisfactionScore === 'number' && Number.isFinite(emp.satisfactionScore)) {
    return Number(emp.satisfactionScore.toFixed(1));
  }
  // Fallback for custom CSV datasets without an explicit satisfaction column
  return Number(
    Math.min(
      98,
      Math.max(45, (emp.competencyScore / 5) * 62 + (emp.selfReviewScore / 5) * 33),
    ).toFixed(1),
  );
}

function getCategoryAvg(kpis: ComputedKpi[], category: KpiMetric['category']): number | null {
  const matches = kpis.filter((k) => k.category === category);
  if (matches.length === 0) return null;
  return Number(
    (matches.reduce((sum, k) => sum + k.attainmentPct, 0) / matches.length).toFixed(1),
  );
}

function extractCorrelationValue(
  group: ComputedEmployeeScore[],
  metric: import('@/types/kpi').KpiCorrelationMetricKey,
): number | null {
  if (group.length === 0) return null;
  const allGroupKpis = group.flatMap((g) => g.kpis);

  switch (metric) {
    case 'satisfaction':
      return Number(
        (
          group.reduce((s, g) => s + getEmployeeSatisfactionPct(g.employee), 0) /
          group.length
        ).toFixed(1),
      );
    case 'output':
      return getCategoryAvg(allGroupKpis, 'Output');
    case 'quality':
      return getCategoryAvg(allGroupKpis, 'Quality');
    case 'efficiency':
      return getCategoryAvg(allGroupKpis, 'Efficiency');
    case 'growth':
      return getCategoryAvg(allGroupKpis, 'Growth');
    case 'overallAttainment':
      return Number(
        (
          group.reduce((s, g) => s + g.weightedAttainmentPct, 0) / group.length
        ).toFixed(1),
      );
    case 'competency':
      return Number(
        (
          group.reduce((s, g) => s + g.employee.competencyScore, 0) / group.length
        ).toFixed(2),
      );
    case 'compositeIndex':
      return Number(
        (group.reduce((s, g) => s + g.compositeIndex, 0) / group.length).toFixed(1),
      );
  }
}

function describeCorrelationStrength(r: number | null): string {
  if (r === null) return 'Data tidak mencukupi';
  const abs = Math.abs(r);
  const dir = r >= 0 ? 'Positif' : 'Negatif';
  if (abs >= 0.7) return `Kuat ${dir}`;
  if (abs >= 0.4) return `Sedang ${dir}`;
  if (abs >= 0.2) return `Lemah ${dir}`;
  return 'Netral / Sangat Lemah';
}

function computePaddedDomain(
  values: number[],
  metric: import('@/types/kpi').KpiCorrelationMetricKey,
): [number, number] {
  if (values.length === 0) {
    return metric === 'competency' ? [3, 5] : [60, 115];
  }
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  if (metric === 'competency') {
    const low = Math.max(1, Math.floor((minVal - 0.3) * 2) / 2);
    const high = Math.min(5, Math.ceil((maxVal + 0.25) * 2) / 2);
    return [low, high > low ? high : Math.min(5, low + 0.5)];
  }

  const low = Math.max(0, Math.floor((minVal - 6) / 5) * 5);
  const high = Math.min(135, Math.ceil((maxVal + 6) / 5) * 5);
  return [low, high > low ? high : low + 10];
}

export function computeKpiCorrelation(
  scores: ComputedEmployeeScore[],
  xMetric: import('@/types/kpi').KpiCorrelationMetricKey,
  yMetric: import('@/types/kpi').KpiCorrelationMetricKey,
  granularity: 'department' | 'owner',
): import('@/types/kpi').KpiCorrelationAnalysis {
  const points: import('@/types/kpi').KpiCorrelationPoint[] = [];

  if (granularity === 'department') {
    const deptMap = new Map<string, ComputedEmployeeScore[]>();
    for (const s of scores) {
      const list = deptMap.get(s.employee.department) ?? [];
      list.push(s);
      deptMap.set(s.employee.department, list);
    }

    for (const [dept, group] of deptMap.entries()) {
      const x = extractCorrelationValue(group, xMetric);
      const y = extractCorrelationValue(group, yMetric);
      if (x === null || y === null) continue;

      const kpiCount = group.reduce((s, g) => s + g.kpiCount, 0);
      points.push({
        id: `dept-${dept}`,
        label: dept,
        subtitle: `${group.length} pemilik · ${kpiCount} KPI`,
        department: dept,
        kpiCount,
        employeeCount: group.length,
        x,
        y,
        z: Math.max(2, kpiCount),
      });
    }
  } else {
    for (const s of scores) {
      const x = extractCorrelationValue([s], xMetric);
      const y = extractCorrelationValue([s], yMetric);
      if (x === null || y === null) continue;

      points.push({
        id: s.employee.id,
        label: s.employee.name,
        subtitle: `${s.employee.department} · ${s.employee.role}`,
        department: s.employee.department,
        employeeId: s.employee.id,
        kpiCount: s.kpiCount,
        employeeCount: 1,
        x,
        y,
        z: Math.max(1, s.kpiCount),
      });
    }
  }

  const xVals = points.map((p) => p.x);
  const yVals = points.map((p) => p.y);
  const xDomain = computePaddedDomain(xVals, xMetric);
  const yDomain = computePaddedDomain(yVals, yMetric);

  if (points.length < 2) {
    return {
      points,
      correlationR: null,
      rSquared: null,
      strengthLabel: 'Data tidak mencukupi',
      xMean: points[0]?.x ?? 0,
      yMean: points[0]?.y ?? 0,
      xDomain,
      yDomain,
      trendSegment: null,
    };
  }

  const n = points.length;
  const xMean = Number((xVals.reduce((a, b) => a + b, 0) / n).toFixed(2));
  const yMean = Number((yVals.reduce((a, b) => a + b, 0) / n).toFixed(2));

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const p of points) {
    const dx = p.x - xMean;
    const dy = p.y - yMean;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denom = Math.sqrt(denX * denY);
  const correlationR = denom > 0 ? Number((num / denom).toFixed(2)) : null;
  const rSquared =
    correlationR !== null ? Number((correlationR * correlationR).toFixed(2)) : null;

  let trendSegment:
    | readonly [{ x: number; y: number }, { x: number; y: number }]
    | null = null;

  if (denX > 0) {
    const slope = num / denX;
    const intercept = yMean - slope * xMean;
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    if (maxX > minX) {
      trendSegment = [
        { x: minX, y: Number((slope * minX + intercept).toFixed(2)) },
        { x: maxX, y: Number((slope * maxX + intercept).toFixed(2)) },
      ] as const;
    }
  }

  return {
    points,
    correlationR,
    rSquared,
    strengthLabel: describeCorrelationStrength(correlationR),
    xMean,
    yMean,
    xDomain,
    yDomain,
    trendSegment,
  };
}
