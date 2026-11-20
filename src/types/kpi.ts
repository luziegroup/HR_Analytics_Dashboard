export type KpiCategory = 'Output' | 'Quality' | 'Efficiency' | 'Growth';

export type KpiStatus = 'Exceeded' | 'On Track' | 'At Risk' | 'Off Track';

export type ReviewStatus = 'Calibrated' | 'Manager Review' | 'Self Review' | 'Pending';

export type PerformancePeriod = 'Q1 2026' | 'Q2 2026' | 'Q3 2026' | 'Q4 2026';

export type KpiView =
  | 'overview'
  | 'scorecard'
  | 'matrix'
  | 'calibration'
  | 'reports'
  | 'import';

export interface KpiMetric {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  title: string;
  category: KpiCategory;
  unit: '%' | 'count' | 'days' | 'USD' | 'score';
  /** Higher is better unless inverse === true (e.g. cycle time, defect rate) */
  inverse?: boolean;
  weight: number; // percentage weight (total per employee ~100)
  target: number;
  actual: number;
  period: PerformancePeriod;
  updatedAt: string;
}

export interface EmployeePerformance {
  id: string;
  name: string;
  role: string;
  department: string;
  level: string;
  manager: string;
  competencyScore: number; // 1.0 - 5.0 behavioral & leadership review
  selfReviewScore: number; // 1.0 - 5.0
  satisfactionScore?: number; // 0 - 100 employee pulse / engagement score
  reviewStatus: ReviewStatus;
  lastReviewDate: string;
  coachingNote?: string;
}

export interface ComputedKpi extends KpiMetric {
  attainmentPct: number;
  status: KpiStatus;
}

export interface ComputedEmployeeScore {
  employee: EmployeePerformance;
  kpis: ComputedKpi[];
  kpiCount: number;
  weightedAttainmentPct: number; // 0 - 130+
  /** Composite index 0 - 100 (70% KPI attainment + 30% Competency) */
  compositeIndex: number;
  finalRating: number; // 1.0 - 5.0
  overallStatus: KpiStatus;
  nineBoxKey: string;
  nineBoxLabel: string;
}

export interface DepartmentPerformanceSummary {
  department: string;
  employeeCount: number;
  kpiCount: number;
  avgAttainmentPct: number;
  avgCompetency: number;
  avgCompositeIndex: number;
  onTrackRatePct: number;
  coachingNeededCount: number;
}

export type KpiCorrelationMetricKey =
  | 'satisfaction'
  | 'output'
  | 'quality'
  | 'efficiency'
  | 'growth'
  | 'overallAttainment'
  | 'competency'
  | 'compositeIndex';

export interface KpiCorrelationPoint {
  id: string;
  label: string;
  subtitle: string;
  department: string;
  employeeId?: string;
  kpiCount: number;
  employeeCount: number;
  x: number;
  y: number;
  z: number;
}

export interface KpiCorrelationAnalysis {
  points: KpiCorrelationPoint[];
  correlationR: number | null;
  rSquared: number | null;
  strengthLabel: string;
  xMean: number;
  yMean: number;
  xDomain: [number, number];
  yDomain: [number, number];
  trendSegment:
    | readonly [{ x: number; y: number }, { x: number; y: number }]
    | null;
}

export interface MonthlyScheduleConfig {
  enabled: boolean;
  runHour: number;
  departmentScope: string;
  autoDownloadPdf: boolean;
}

export interface MonthlyReportDownwardHighlight {
  kpiId: string;
  kpiTitle: string;
  owner: string;
  department: string;
  dropPts: number;
  currentAttainmentPct: number;
  severity: 'Critical' | 'Warning';
}

export interface MonthlySummaryReport {
  id: string;
  monthKey: string; // YYYY-MM
  monthLabel: string;
  generatedAt: string; // ISO string
  trigger: 'Scheduled (1st of Month)' | 'Manual Run';
  scopeDepartment: string;
  avgAttainmentPct: number;
  onTrackRatePct: number;
  avgCompositeIndex: number;
  totalKpis: number;
  downwardAlertCount: number;
  topDepartment: string;
  attentionDepartment: string;
  departments: DepartmentPerformanceSummary[];
  downwardHighlights: MonthlyReportDownwardHighlight[];
  read: boolean;
}
