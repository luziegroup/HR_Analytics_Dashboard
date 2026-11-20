import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import type {
  ComputedEmployeeScore,
  KpiCorrelationMetricKey,
  KpiCorrelationPoint,
} from '@/types/kpi';
import {
  computeKpiCorrelation,
  KPI_CORRELATION_METRICS,
} from '@/utils/kpiAnalytics';

interface KpiCorrelationScatterChartProps {
  scores: ComputedEmployeeScore[];
  onSelectEmployee: (employeeId: string) => void;
}

const DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: '#2563EB',
  Product: '#7C3AED',
  Sales: '#D97706',
  Operations: '#059669',
  Finance: '#0F766E',
  'People & HR': '#DB2777',
};

const FALLBACK_COLORS = [
  '#2563EB',
  '#7C3AED',
  '#D97706',
  '#059669',
  '#0F766E',
  '#DB2777',
  '#475569',
];

const CORRELATION_PRESETS: Array<{
  id: string;
  label: string;
  x: KpiCorrelationMetricKey;
  y: KpiCorrelationMetricKey;
}> = [
  {
    id: 'sat-out',
    label: 'Kepuasan vs. Output',
    x: 'satisfaction',
    y: 'output',
  },
  {
    id: 'qual-eff',
    label: 'Kualitas vs. Efisiensi',
    x: 'quality',
    y: 'efficiency',
  },
  {
    id: 'comp-att',
    label: 'Kompetensi vs. Capaian',
    x: 'competency',
    y: 'overallAttainment',
  },
  {
    id: 'out-growth',
    label: 'Output vs. Pertumbuhan',
    x: 'output',
    y: 'growth',
  },
];

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: KpiCorrelationPoint;
  }>;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
}

const CorrelationTooltip: React.FC<ScatterTooltipProps> = ({
  active,
  payload,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3.5 py-2.5 text-xs">
      <div className="pb-1.5 mb-1.5 border-b border-slate-100">
        <div className="font-semibold text-slate-900">{pt.label}</div>
        <div className="text-slate-500">{pt.subtitle}</div>
      </div>
      <div className="space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-600">{xLabel}</span>
          <span className="font-semibold text-slate-900">
            {pt.x}
            {xUnit}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-600">{yLabel}</span>
          <span className="font-semibold text-slate-900">
            {pt.y}
            {yUnit}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5 text-slate-500 pt-0.5">
          <span>Sampel KPI</span>
          <span>{pt.kpiCount} KPI</span>
        </div>
      </div>
    </div>
  );
};

export const KpiCorrelationScatterChart: React.FC<
  KpiCorrelationScatterChartProps
> = ({ scores, onSelectEmployee }) => {
  const [xMetric, setXMetric] = useState<KpiCorrelationMetricKey>('satisfaction');
  const [yMetric, setYMetric] = useState<KpiCorrelationMetricKey>('output');
  const [granularity, setGranularity] = useState<'department' | 'owner'>(
    'department',
  );

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(scores.map((s) => s.employee.department))).sort();
  }, [scores]);

  // If the user filters down to a single department, automatically evaluate at owner granularity
  const effectiveGranularity: 'department' | 'owner' =
    uniqueDepartments.length <= 1 ? 'owner' : granularity;

  const analysis = useMemo(
    () => computeKpiCorrelation(scores, xMetric, yMetric, effectiveGranularity),
    [scores, xMetric, yMetric, effectiveGranularity],
  );

  const groupedSeries = useMemo(() => {
    const map = new Map<string, KpiCorrelationPoint[]>();
    for (const pt of analysis.points) {
      const arr = map.get(pt.department) ?? [];
      arr.push(pt);
      map.set(pt.department, arr);
    }
    return Array.from(map.entries()).map(([department, data], idx) => ({
      department,
      data,
      color:
        DEPARTMENT_COLORS[department] ??
        FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    }));
  }, [analysis.points]);

  const xMeta =
    KPI_CORRELATION_METRICS.find((m) => m.key === xMetric) ??
    KPI_CORRELATION_METRICS[0];
  const yMeta =
    KPI_CORRELATION_METRICS.find((m) => m.key === yMetric) ??
    KPI_CORRELATION_METRICS[1];

  const rColorClass =
    analysis.correlationR === null
      ? 'text-slate-600'
      : analysis.correlationR >= 0.4
        ? 'text-emerald-700'
        : analysis.correlationR <= -0.4
          ? 'text-red-700'
          : 'text-slate-700';

  return (
    <SectionCard
      title="Eksplorasi Korelasi KPI Departemen"
      subtitle="Analisis diagram tebar dengan garis tren regresi linear untuk mengidentifikasi hubungan antar dimensi KPI"
      action={
        <div className="text-right font-mono text-xs tabular-nums">
          <div className={`font-semibold ${rColorClass}`}>
            {analysis.correlationR !== null
              ? `r = ${analysis.correlationR >= 0 ? `+${analysis.correlationR.toFixed(2)}` : analysis.correlationR.toFixed(2)} · R² = ${analysis.rSquared?.toFixed(2)}`
              : 'r = —'}
          </div>
          <div className="text-slate-500">
            {analysis.strengthLabel} · {analysis.points.length}{' '}
            {effectiveGranularity === 'department' ? 'departemen' : 'pemilik KPI'}
          </div>
        </div>
      }
    >
      {/* Interactive Presets, Axis Selectors & Granularity Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          role="group"
          aria-label="Preset korelasi"
        >
          {CORRELATION_PRESETS.map((preset) => {
            const isActive = xMetric === preset.x && yMetric === preset.y;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setXMetric(preset.x);
                  setYMetric(preset.y);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium text-slate-500">X:</span>
            <select
              aria-label="Metrik KPI sumbu X"
              value={xMetric}
              onChange={(e) =>
                setXMetric(e.target.value as KpiCorrelationMetricKey)
              }
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              {KPI_CORRELATION_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Y:</span>
            <select
              aria-label="Metrik KPI sumbu Y"
              value={yMetric}
              onChange={(e) =>
                setYMetric(e.target.value as KpiCorrelationMetricKey)
              }
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              {KPI_CORRELATION_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {uniqueDepartments.length > 1 && (
            <div
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
              role="group"
              aria-label="Tingkat tampilan data"
            >
              <button
                type="button"
                onClick={() => setGranularity('department')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  effectiveGranularity === 'department'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Departemen
              </button>
              <button
                type="button"
                onClick={() => setGranularity('owner')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  effectiveGranularity === 'owner'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pemilik KPI
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scatter Plot */}
      {analysis.points.length < 2 ? (
        <EmptyState
          title="Data KPI tidak cukup untuk pasangan metrik ini"
          description="Pilih pasangan KPI lain atau reset filter departemen agar minimal dua titik data dapat dikorelasikan."
          action={
            <button
              type="button"
              onClick={() => {
                setXMetric('satisfaction');
                setYMetric('output');
              }}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Kembali ke Kepuasan vs. Output
            </button>
          }
        />
      ) : (
        <>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 24, bottom: 20, left: 4 }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={xMeta.shortLabel}
                  domain={analysis.xDomain}
                  tickFormatter={(v) => `${v}${xMeta.unit}`}
                  tick={{
                    fill: '#64748B',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                  }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                  label={{
                    value: xMeta.label,
                    position: 'insideBottom',
                    offset: -12,
                    fill: '#475569',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={yMeta.shortLabel}
                  domain={analysis.yDomain}
                  tickFormatter={(v) => `${v}${yMeta.unit}`}
                  tick={{
                    fill: '#64748B',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                  }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: yMeta.label,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 6,
                    style: { textAnchor: 'middle', fill: '#475569', fontSize: 11 },
                  }}
                />
                <ZAxis
                  type="number"
                  dataKey="z"
                  range={
                    effectiveGranularity === 'department'
                      ? [180, 420]
                      : [80, 180]
                  }
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#94A3B8' }}
                  content={
                    <CorrelationTooltip
                      xLabel={xMeta.shortLabel}
                      yLabel={yMeta.shortLabel}
                      xUnit={xMeta.unit}
                      yUnit={yMeta.unit}
                    />
                  }
                />
                <Legend
                  verticalAlign="top"
                  align="left"
                  height={32}
                  wrapperStyle={{ fontSize: '12px', color: '#475569' }}
                />

                {/* Mean Quadrant Reference Lines */}
                <ReferenceLine
                  x={analysis.xMean}
                  stroke="#CBD5E1"
                  strokeDasharray="3 3"
                />
                <ReferenceLine
                  y={analysis.yMean}
                  stroke="#CBD5E1"
                  strokeDasharray="3 3"
                />

                {/* Linear Regression Trendline */}
                {analysis.trendSegment && (
                  <ReferenceLine
                    segment={analysis.trendSegment}
                    stroke="#0F172A"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    strokeOpacity={0.55}
                    ifOverflow="extendDomain"
                  />
                )}

                {groupedSeries.map((series) => (
                  <Scatter
                    key={series.department}
                    name={series.department}
                    data={series.data}
                    fill={series.color}
                    fillOpacity={0.82}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                    className={
                      effectiveGranularity === 'owner'
                        ? 'cursor-pointer'
                        : undefined
                    }
                    onClick={(pointData: unknown) => {
                      const pt = pointData as Partial<KpiCorrelationPoint>;
                      if (pt?.employeeId) {
                        onSelectEmployee(pt.employeeId);
                      }
                    }}
                  >
                    {effectiveGranularity === 'department' && (
                      <LabelList
                        dataKey="label"
                        position="top"
                        offset={8}
                        style={{
                          fill: '#334155',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      />
                    )}
                  </Scatter>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-mono tabular-nums">
              Garis kuadran rata-rata: {xMeta.shortLabel} {analysis.xMean}
              {xMeta.unit} · {yMeta.shortLabel} {analysis.yMean}
              {yMeta.unit}
            </span>
            <span>
              {effectiveGranularity === 'department'
                ? 'Ukuran gelembung mencerminkan jumlah KPI · garis putus-putus menunjukkan tren regresi linear'
                : 'Klik titik pemilik KPI untuk membuka panel kartu skor'}
            </span>
          </div>
        </>
      )}
    </SectionCard>
  );
};
