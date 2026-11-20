import React, { useState } from 'react';
import { X } from 'lucide-react';
import { KpiStatusLabel, ReviewStatusLabel } from '@/components/ui/KpiStatusLabel';
import type { ComputedEmployeeScore, ReviewStatus } from '@/types/kpi';
import { formatKpiValue } from '@/utils/kpiAnalytics';

interface PerformanceDrawerProps {
  score: ComputedEmployeeScore | null;
  onClose: () => void;
  onUpdateKpiActual: (kpiId: string, newActual: number) => void;
  onUpdateReview: (
    employeeId: string,
    status: ReviewStatus,
    competencyScore?: number,
  ) => void;
}

const REVIEW_STATUSES: Array<{ value: ReviewStatus; label: string }> = [
  { value: 'Pending', label: 'Menunggu' },
  { value: 'Self Review', label: 'Penilaian Mandiri' },
  { value: 'Manager Review', label: 'Tinjauan Manajer' },
  { value: 'Calibrated', label: 'Terkalibrasi' },
];

const CATEGORY_LABELS: Record<string, string> = {
  Output: 'Output',
  Quality: 'Kualitas',
  Efficiency: 'Efisiensi',
  Growth: 'Pertumbuhan',
};

export const PerformanceDrawer: React.FC<PerformanceDrawerProps> = ({
  score,
  onClose,
  onUpdateKpiActual,
  onUpdateReview,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');

  if (!score) return null;

  const { employee, kpis } = score;

  const startEdit = (kpiId: string, currentActual: number) => {
    setEditingId(kpiId);
    setDraftValue(String(currentActual));
  };

  const commitEdit = (kpiId: string) => {
    const parsed = Number(draftValue);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onUpdateKpiActual(kpiId, parsed);
    }
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Kartu skor KPI untuk ${employee.name}`}
    >
      <aside
        className="w-full max-w-xl bg-white h-full border-l border-slate-200 shadow-xl flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-slate-500">
                {employee.id} · {employee.level} · Manajer: {employee.manager}
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {employee.name}
              </h2>
              <p className="text-sm text-slate-600">
                {employee.role} · {employee.department}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup kartu skor"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Composite Summary */}
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50/60">
            <div>
              <div className="text-xs text-slate-500">Capaian KPI</div>
              <div className="mt-1 text-lg font-mono font-semibold text-slate-900 tabular-nums">
                {score.weightedAttainmentPct}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Kompetensi</div>
              <div className="mt-1 text-lg font-mono font-semibold text-slate-900 tabular-nums">
                {employee.competencyScore.toFixed(1)} / 5,0
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Indeks Kinerja</div>
              <div className="mt-1 text-lg font-mono font-semibold text-blue-700 tabular-nums">
                {score.compositeIndex}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Segmen 9-Box</div>
              <div className="mt-1 text-xs font-semibold text-slate-900">
                {score.nineBoxLabel}
              </div>
            </div>
          </div>

          {/* Individual KPIs */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Target KPI Ditugaskan ({kpis.length})
              </h3>
              <span className="text-xs text-slate-500">
                Klik Perbarui untuk menyesuaikan capaian aktual
              </span>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
              {kpis.map((kpi) => {
                const isEditing = editingId === kpi.id;
                return (
                  <div key={kpi.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {kpi.title}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {CATEGORY_LABELS[kpi.category] ?? kpi.category} · Bobot {kpi.weight}% ·{' '}
                          {kpi.inverse ? 'Lebih rendah lebih baik' : 'Lebih tinggi lebih baik'}
                        </div>
                      </div>
                      <KpiStatusLabel status={kpi.status} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="font-mono text-slate-700 tabular-nums">
                        Target: <strong>{formatKpiValue(kpi.target, kpi.unit)}</strong> ·
                        Aktual: <strong>{formatKpiValue(kpi.actual, kpi.unit)}</strong> ·{' '}
                        <span className="text-slate-900 font-semibold">
                          {kpi.attainmentPct}%
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            className="w-24 px-2 py-1 text-xs font-mono border border-blue-600 rounded bg-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => commitEdit(kpi.id)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(kpi.id, kpi.actual)}
                          className="text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                        >
                          Perbarui Aktual
                        </button>
                      )}
                    </div>

                    <div className="h-1.5 w-full bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className={`h-full rounded-sm ${
                          kpi.attainmentPct >= 105
                            ? 'bg-blue-600'
                            : kpi.attainmentPct >= 85
                              ? 'bg-emerald-600'
                              : kpi.attainmentPct >= 70
                                ? 'bg-amber-500'
                                : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(100, kpi.attainmentPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calibration Controls */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Kalibrasi Penilaian & Kompetensi
                </h3>
                <ReviewStatusLabel status={employee.reviewStatus} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                <label className="text-xs text-slate-600 space-y-1">
                  <span className="block font-medium">Tahap Penilaian</span>
                  <select
                    value={employee.reviewStatus}
                    onChange={(e) =>
                      onUpdateReview(employee.id, e.target.value as ReviewStatus)
                    }
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {REVIEW_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-slate-600 space-y-1">
                  <span className="block font-medium">Skor Kompetensi (1,0 – 5,0)</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={employee.competencyScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val)) {
                        onUpdateReview(employee.id, employee.reviewStatus, val);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </label>
              </div>

              {employee.coachingNote && (
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-800">Catatan Manajer:</strong>{' '}
                  {employee.coachingNote}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Tutup Kartu Skor
          </button>
        </div>
      </aside>
    </div>
  );
};
