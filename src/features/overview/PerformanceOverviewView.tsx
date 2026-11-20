import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DownwardTrendAlert } from '@/components/alerts/DownwardTrendAlert';
import { MonthlyReportNotification } from '@/components/alerts/MonthlyReportNotification';
import { KpiCorrelationScatterChart } from '@/components/charts/KpiCorrelationScatterChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiStatusLabel } from '@/components/ui/KpiStatusLabel';
import { SectionCard } from '@/components/ui/SectionCard';
import type {
  ComputedEmployeeScore,
  ComputedKpi,
  MonthlySummaryReport,
} from '@/types/kpi';
import {
  computeDepartmentPerformance,
  computeExecutiveKpis,
  computeMonthlyPerformanceTrend,
  computeQuarterlyTrend,
  detectDownwardTrendKpis,
  type MonthlyPerformancePoint,
} from '@/utils/kpiAnalytics';

interface PerformanceOverviewViewProps {
  scores: ComputedEmployeeScore[];
  kpis: ComputedKpi[];
  onSelectEmployee: (employeeId: string) => void;
  onNavigateScorecard: () => void;
  unreadReports?: MonthlySummaryReport[];
  onViewMonthlyReport?: (reportId: string) => void;
  onDownloadMonthlyPdf?: (report: MonthlySummaryReport) => void;
  onDismissMonthlyReport?: (reportId: string) => void;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: MonthlyPerformancePoint;
  }>;
  label?: string;
}

const MonthlyTrendTooltip: React.FC<TrendTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  const delta = point?.momDelta;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3.5 py-2.5 text-xs">
      <div className="flex items-center justify-between gap-4 pb-1.5 mb-1.5 border-b border-slate-100">
        <span className="font-semibold text-slate-900">{label}</span>
        {delta !== null && delta !== undefined && (
          <span
            className={`font-mono tabular-nums font-medium ${
              delta >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {delta >= 0 ? `+${delta}%` : `${delta}%`} bln/bln
          </span>
        )}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-5 font-mono tabular-nums"
          >
            <span className="text-slate-600 flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-xs"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-slate-900">
              {entry.value}
              {entry.name?.includes('Capaian') ? '%' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PerformanceOverviewView: React.FC<PerformanceOverviewViewProps> = ({
  scores,
  kpis,
  onSelectEmployee,
  onNavigateScorecard,
  unreadReports = [],
  onViewMonthlyReport,
  onDownloadMonthlyPdf,
  onDismissMonthlyReport,
}) => {
  const exec = computeExecutiveKpis(scores, kpis);
  const departments = computeDepartmentPerformance(scores);
  const avgCompetency =
    scores.length > 0
      ? Number(
          (
            scores.reduce((s, e) => s + e.employee.competencyScore, 0) / scores.length
          ).toFixed(2),
        )
      : 0;
  const trend = computeQuarterlyTrend(exec.avgAttainment, avgCompetency);
  const monthlyTrend = computeMonthlyPerformanceTrend(
    exec.avgAttainment,
    exec.avgCompositeIndex,
  );
  const downwardTrendKpis = detectDownwardTrendKpis(kpis);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const coachingQueue = scores
    .filter((s) => s.weightedAttainmentPct < 90)
    .sort((a, b) => a.weightedAttainmentPct - b.weightedAttainmentPct)
    .slice(0, 6);

  // Latest MoM comparison summary
  const latestMonth = monthlyTrend[monthlyTrend.length - 1];
  const latestDelta = latestMonth?.momDelta ?? 0;

  // SVG Quarterly Trend Geometry
  const chartW = 640;
  const chartH = 210;
  const padL = 42;
  const padR = 24;
  const padT = 20;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const minVal = 70;
  const maxVal = 110;

  const points = trend.map((pt, idx) => {
    const x = padL + (idx / Math.max(1, trend.length - 1)) * innerW;
    const y =
      padT +
      innerH -
      ((pt.attainment - minVal) / Math.max(1, maxVal - minVal)) * innerH;
    return { x, y, ...pt };
  });

  const targetY =
    padT + innerH - ((100 - minVal) / Math.max(1, maxVal - minVal)) * innerH;
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : points[points.length - 1];

  return (
    <div className="space-y-6">
      {unreadReports.length > 0 &&
        onViewMonthlyReport &&
        onDownloadMonthlyPdf &&
        onDismissMonthlyReport && (
          <MonthlyReportNotification
            unreadReports={unreadReports}
            onViewReport={onViewMonthlyReport}
            onDownloadPdf={onDownloadMonthlyPdf}
            onDismiss={onDismissMonthlyReport}
          />
        )}

      {/* Executive Performance KPI Strip */}
      <section
        aria-label="Metrik kinerja utama"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Rata-rata Capaian KPI</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 font-display tabular-nums">
              {exec.avgAttainment}%
            </span>
            <span className="text-xs text-blue-700 font-medium tabular-nums">
              Target 100%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Dari {exec.totalKpis} KPI terukur
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">KPI Sesuai / Melampaui Target</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 font-display tabular-nums">
              {exec.onTrackRate}%
            </span>
            <span className="text-xs text-emerald-700 font-medium tabular-nums">
              {exec.onTrackKpis} dari {exec.totalKpis} KPI
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Ambang batas pencapaian ≥ 85%
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Indeks Kinerja Komposit</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 font-display tabular-nums">
              {exec.avgCompositeIndex}
            </span>
            <span className="text-xs text-slate-700 font-medium tabular-nums">
              Skor {exec.avgFinalRating} / 5,0
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            70% Capaian KPI + 30% Kompetensi
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Perlu Pembinaan</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 font-display tabular-nums">
              {exec.coachingNeeded}
            </span>
            <span
              className={`text-xs font-medium tabular-nums ${
                exec.coachingNeeded > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {exec.calibratedCount}/{exec.totalEmployees} terkalibrasi
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Pemilik KPI dengan capaian &lt; 80%
          </p>
        </div>
      </section>

      {/* 3-Month Downward Trend Notification */}
      <DownwardTrendAlert
        items={downwardTrendKpis}
        onInspectOwner={onSelectEmployee}
        onNavigateScorecard={onNavigateScorecard}
      />

      {/* Month-over-Month Performance Trends (Recharts) */}
      <SectionCard
        title="Tren Kinerja Bulan ke Bulan"
        subtitle="Perkembangan Capaian KPI (%) dan Indeks Kinerja Komposit selama 12 bulan vs. target dasar 100%"
        action={
          latestMonth && (
            <div className="text-right font-mono text-xs tabular-nums">
              <div className="font-medium text-slate-900">
                {latestMonth.month} · {latestMonth.attainment}% capaian
              </div>
              <div className={latestDelta >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                {latestDelta >= 0 ? `+${latestDelta}%` : `${latestDelta}%`} vs bulan sebelumnya
              </div>
            </div>
          )
        }
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyTrend}
              margin={{ top: 10, right: 16, left: -8, bottom: 4 }}
            >
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                domain={[60, 115]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MonthlyTrendTooltip />} />
              <Legend
                verticalAlign="top"
                align="left"
                height={32}
                iconType="plainline"
                wrapperStyle={{ fontSize: '12px', color: '#475569' }}
              />
              <ReferenceLine
                y={100}
                stroke="#64748B"
                strokeDasharray="4 4"
                label={{
                  value: 'Target 100%',
                  position: 'insideTopRight',
                  fill: '#64748B',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="attainment"
                name="Capaian KPI"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 5.5, fill: '#1D4ED8', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="compositeIndex"
                name="Indeks Komposit"
                stroke="#059669"
                strokeWidth={2}
                dot={{ r: 3, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: '#047857', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Departmental KPI Correlation Scatter Plot */}
      <KpiCorrelationScatterChart
        scores={scores}
        onSelectEmployee={onSelectEmployee}
      />

      {/* Quarterly Trajectory + Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <SectionCard
          title="Tren Pencapaian KPI Kuartalan"
          subtitle="Perkembangan pencapaian aktual terhadap target kuartalan 100%"
          className="lg:col-span-7"
          action={
            activePoint && (
              <div className="text-right font-mono text-xs tabular-nums">
                <div className="font-medium text-slate-900">
                  {activePoint.quarter} · {activePoint.attainment}% capaian
                </div>
                <div className="text-slate-500">
                  Rata-rata Kompetensi: {activePoint.competency} / 5,0
                </div>
              </div>
            )
          }
        >
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-52 select-none"
              role="img"
              aria-label="Grafik tren pencapaian KPI kuartalan"
            >
              <defs>
                <linearGradient id="kpiFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {[110, 100, 90, 80, 70].map((val) => {
                const y =
                  padT +
                  innerH -
                  ((val - minVal) / Math.max(1, maxVal - minVal)) * innerH;
                return (
                  <g key={val}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray={val === 70 ? undefined : '3 3'}
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono tabular-nums"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              <line
                x1={padL}
                y1={targetY}
                x2={chartW - padR}
                y2={targetY}
                stroke="#0F172A"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.35"
              />

              {areaPath && <path d={areaPath} fill="url(#kpiFill)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((pt, idx) => {
                const isSelected = hoveredIdx === idx;
                return (
                  <g
                    key={pt.quarter}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={pt.x - innerW / points.length / 2}
                      y={padT}
                      width={innerW / points.length}
                      height={innerH + padB}
                      fill="transparent"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 5.5 : 4}
                      fill={isSelected ? '#1D4ED8' : '#2563EB'}
                      stroke="#FFFFFF"
                      strokeWidth="1.75"
                    />
                    <text
                      x={pt.x}
                      y={chartH - 8}
                      textAnchor="middle"
                      className={`text-[11px] font-mono ${
                        isSelected ? 'fill-slate-900 font-semibold' : 'fill-slate-500'
                      }`}
                    >
                      {pt.quarter}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </SectionCard>

        <SectionCard
          title="Capaian KPI per Departemen"
          subtitle="Rata-rata capaian berbobot % dan rasio KPI sesuai target per tim"
          className="lg:col-span-5"
        >
          {departments.length === 0 ? (
            <EmptyState
              title="Tidak ada departemen yang cocok"
              description="Sesuaikan filter untuk memeriksa kartu skor departemen."
            />
          ) : (
            <div className="space-y-3.5">
              {departments.map((d) => (
                <div key={d.department} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800">{d.department}</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {d.avgAttainmentPct}% rata-rata · {d.onTrackRatePct}% sesuai ·{' '}
                      {d.avgCompetency}/5,0
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm transition-all duration-200 ${
                        d.avgAttainmentPct >= 100
                          ? 'bg-blue-600'
                          : d.avgAttainmentPct >= 85
                            ? 'bg-emerald-600'
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, d.avgAttainmentPct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Priority Performance Review Queue */}
      <SectionCard
        title="Antrean Pembinaan Kinerja Prioritas"
        subtitle="Karyawan dengan capaian KPI berbobot di bawah 90% — klik baris untuk meninjau atau memperbarui realisasi"
        noPadding
        action={
          <button
            type="button"
            onClick={onNavigateScorecard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Buka kartu skor KPI lengkap
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        {coachingQueue.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
            title="Seluruh pemilik KPI mencapai ≥ 90%"
            description="Tidak ada intervensi pembinaan KPI mendesak pada cakupan data ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-5">Karyawan</th>
                  <th className="py-2.5 px-4">Departemen & Jabatan</th>
                  <th className="py-2.5 px-4 text-right">KPI</th>
                  <th className="py-2.5 px-4 text-right">Capaian Berbobot</th>
                  <th className="py-2.5 px-4 text-right">Kompetensi</th>
                  <th className="py-2.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {coachingQueue.map((item) => (
                  <tr
                    key={item.employee.id}
                    onClick={() => onSelectEmployee(item.employee.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-5">
                      <div className="font-medium text-slate-900">
                        {item.employee.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {item.employee.id} · Manajer: {item.employee.manager}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700">
                      {item.employee.department} · {item.employee.role}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {item.kpiCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {item.weightedAttainmentPct}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {item.employee.competencyScore.toFixed(1)} / 5,0
                    </td>
                    <td className="py-2.5 px-5 text-right">
                      <KpiStatusLabel status={item.overallStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
