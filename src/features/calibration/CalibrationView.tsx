import React, { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReviewStatusLabel } from '@/components/ui/KpiStatusLabel';
import { SectionCard } from '@/components/ui/SectionCard';
import type { ComputedEmployeeScore, ReviewStatus } from '@/types/kpi';

interface CalibrationViewProps {
  scores: ComputedEmployeeScore[];
  onSelectEmployee: (employeeId: string) => void;
  onUpdateReview: (
    employeeId: string,
    status: ReviewStatus,
    competencyScore?: number,
  ) => void;
}

const STAGES: Array<{ value: 'All' | ReviewStatus; label: string }> = [
  { value: 'All', label: 'Semua' },
  { value: 'Pending', label: 'Menunggu' },
  { value: 'Self Review', label: 'Penilaian Mandiri' },
  { value: 'Manager Review', label: 'Tinjauan Manajer' },
  { value: 'Calibrated', label: 'Terkalibrasi' },
];

const STAGE_LABEL_MAP: Record<ReviewStatus, string> = {
  Pending: 'Menunggu',
  'Self Review': 'Penilaian Mandiri',
  'Manager Review': 'Tinjauan Manajer',
  Calibrated: 'Terkalibrasi',
};

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  scores,
  onSelectEmployee,
  onUpdateReview,
}) => {
  const [stageFilter, setStageFilter] = useState<'All' | ReviewStatus>('All');

  const stageCounts = useMemo(() => {
    const map: Record<ReviewStatus, number> = {
      Pending: 0,
      'Self Review': 0,
      'Manager Review': 0,
      Calibrated: 0,
    };
    for (const s of scores) {
      map[s.employee.reviewStatus] += 1;
    }
    return map;
  }, [scores]);

  const filtered = useMemo(() => {
    if (stageFilter === 'All') return scores;
    return scores.filter((s) => s.employee.reviewStatus === stageFilter);
  }, [scores, stageFilter]);

  return (
    <div className="space-y-6">
      {/* Calibration Progress Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 sm:divide-x divide-slate-200">
        {(['Calibrated', 'Manager Review', 'Self Review', 'Pending'] as ReviewStatus[]).map(
          (stage) => (
            <div key={stage} className="p-5">
              <p className="text-xs font-medium text-slate-500">
                {STAGE_LABEL_MAP[stage]}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-slate-900 font-display tabular-nums">
                  {stageCounts[stage]}
                </span>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {scores.length > 0
                    ? Math.round((stageCounts[stage] / scores.length) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          ),
        )}
      </section>

      <SectionCard
        title="Daftar Kalibrasi & Penilaian Kinerja"
        subtitle="Bandingkan penilaian mandiri terhadap skor KPI terkalibrasi dan lanjutkan tahap tinjauan"
        noPadding
        action={
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {STAGES.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setStageFilter(st.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  stageFilter === st.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada penilaian pada tahap ini"
            description="Pilih filter tahap kalibrasi lain untuk memeriksa penilaian karyawan."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-5">Karyawan & Manajer</th>
                  <th className="py-2.5 px-4 text-right">Skor Mandiri</th>
                  <th className="py-2.5 px-4 text-right">Kompetensi</th>
                  <th className="py-2.5 px-4 text-right">Skor Komposit</th>
                  <th className="py-2.5 px-4 text-right">Selisih</th>
                  <th className="py-2.5 px-4">Tahap Penilaian</th>
                  <th className="py-2.5 px-5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((s) => {
                  const variance = Number(
                    (s.finalRating - s.employee.selfReviewScore).toFixed(2),
                  );
                  return (
                    <tr key={s.employee.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-5">
                        <button
                          type="button"
                          onClick={() => onSelectEmployee(s.employee.id)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-medium text-slate-900 group-hover:text-blue-700">
                            {s.employee.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {s.employee.department} · Manajer: {s.employee.manager}
                          </div>
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {s.employee.selfReviewScore.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {s.employee.competencyScore.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {s.finalRating.toFixed(2)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono text-xs tabular-nums ${
                          variance < -0.3
                            ? 'text-red-700 font-medium'
                            : variance > 0.2
                              ? 'text-emerald-700 font-medium'
                              : 'text-slate-600'
                        }`}
                      >
                        {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4">
                        <ReviewStatusLabel status={s.employee.reviewStatus} />
                      </td>
                      <td className="py-2.5 px-5 text-right">
                        {s.employee.reviewStatus !== 'Calibrated' ? (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateReview(s.employee.id, 'Calibrated')
                            }
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Tandai Terkalibrasi
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectEmployee(s.employee.id)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                          >
                            Periksa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
