import React, { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiStatusLabel } from '@/components/ui/KpiStatusLabel';
import { SectionCard } from '@/components/ui/SectionCard';
import type { ComputedEmployeeScore } from '@/types/kpi';

interface PerformanceMatrixViewProps {
  scores: ComputedEmployeeScore[];
  onSelectEmployee: (employeeId: string) => void;
}

const MATRIX_CELLS = [
  { key: 'high-low', label: 'Berorientasi Hasil (Pembinaan)', axis: 'Komp Tinggi · KPI Rendah' },
  { key: 'high-mid', label: 'Potensi Tinggi', axis: 'Komp Tinggi · KPI Sedang' },
  { key: 'high-high', label: 'Kinerja Bintang', axis: 'Komp Tinggi · KPI Tinggi' },
  { key: 'mid-low', label: 'Di Bawah Ekspektasi', axis: 'Komp Sedang · KPI Rendah' },
  { key: 'mid-mid', label: 'Kontributor Inti', axis: 'Komp Sedang · KPI Sedang' },
  { key: 'mid-high', label: 'Berdampak Tinggi', axis: 'Komp Sedang · KPI Tinggi' },
  { key: 'low-low', label: 'Intervensi Kinerja', axis: 'Komp Rendah · KPI Rendah' },
  { key: 'low-mid', label: 'Dalam Pengembangan', axis: 'Komp Rendah · KPI Sedang' },
  { key: 'low-high', label: 'Ketidaksesuaian Kapabilitas', axis: 'Komp Rendah · KPI Tinggi' },
];

export const PerformanceMatrixView: React.FC<PerformanceMatrixViewProps> = ({
  scores,
  onSelectEmployee,
}) => {
  const [selectedBox, setSelectedBox] = useState<string | null>(null);

  const countsByBox = useMemo(() => {
    const map = new Map<string, ComputedEmployeeScore[]>();
    for (const s of scores) {
      const arr = map.get(s.nineBoxKey) ?? [];
      arr.push(s);
      map.set(s.nineBoxKey, arr);
    }
    return map;
  }, [scores]);

  const ratingTiers = [
    { label: 'Istimewa (4,5 – 5,0)', min: 4.5, max: 5.1, barClass: 'bg-blue-600' },
    { label: 'Sangat Baik (3,8 – 4,49)', min: 3.8, max: 4.5, barClass: 'bg-emerald-600' },
    { label: 'Baik (3,0 – 3,79)', min: 3.0, max: 3.8, barClass: 'bg-amber-500' },
    { label: 'Perlu Peningkatan (< 3,0)', min: 0, max: 3.0, barClass: 'bg-red-600' },
  ].map((tier) => {
    const count = scores.filter(
      (s) => s.finalRating >= tier.min && s.finalRating < tier.max,
    ).length;
    const pct = scores.length > 0 ? Math.round((count / scores.length) * 100) : 0;
    return { ...tier, count, pct };
  });

  const displayedEmployees = useMemo(() => {
    if (!selectedBox) return scores;
    return scores.filter((s) => s.nineBoxKey === selectedBox);
  }, [scores, selectedBox]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 9-Box Matrix */}
        <SectionCard
          title="Matriks Kinerja 9-Box"
          subtitle="Sumbu Y: Tinjauan Kompetensi · Sumbu X: Capaian KPI Berbobot — klik sel untuk memfilter"
          className="lg:col-span-7"
          action={
            selectedBox && (
              <button
                type="button"
                onClick={() => setSelectedBox(null)}
                className="text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
              >
                Tampilkan semua ({scores.length})
              </button>
            )
          }
        >
          <div className="grid grid-cols-3 gap-2.5">
            {MATRIX_CELLS.map((cell) => {
              const members = countsByBox.get(cell.key) ?? [];
              const isSelected = selectedBox === cell.key;
              const isTopRight = cell.key === 'high-high';
              const isBottomLeft = cell.key === 'low-low';

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedBox(isSelected ? null : cell.key)}
                  className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70'
                      : isTopRight
                        ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                        : isBottomLeft
                          ? 'border-red-200 bg-red-50/30 hover:border-red-300'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {cell.label}
                    </span>
                    <span className="text-base font-mono font-semibold text-slate-900 tabular-nums">
                      {members.length}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 font-mono">
                    {cell.axis}
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Rating Distribution */}
        <SectionCard
          title="Distribusi Peringkat Komposit"
          subtitle="Distribusi berbobot di seluruh tingkat kinerja (1,0 – 5,0)"
          className="lg:col-span-5"
        >
          <div className="space-y-4">
            {ratingTiers.map((tier) => (
              <div key={tier.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-slate-800">{tier.label}</span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    {tier.count} staf ({tier.pct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-sm overflow-hidden">
                  <div
                    className={`h-full rounded-sm ${tier.barClass}`}
                    style={{ width: `${Math.max(tier.count > 0 ? 4 : 0, tier.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="font-medium text-slate-700">Metodologi Penilaian</div>
            <p>
              Peringkat Komposit menggabungkan <strong>70% Capaian KPI Kuantitatif</strong> dan{' '}
              <strong>30% Kompetensi Perilaku</strong> dalam skala terkalibrasi 5 poin.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Filtered Matrix Cohort Table */}
      <SectionCard
        title={
          selectedBox
            ? `Segmen: ${MATRIX_CELLS.find((c) => c.key === selectedBox)?.label}`
            : 'Seluruh Karyawan Terevaluasi'
        }
        subtitle="Klik baris karyawan untuk memeriksa bobot KPI individu dan memperbarui realisasi"
        noPadding
      >
        {displayedEmployees.length === 0 ? (
          <EmptyState
            title="Tidak ada karyawan pada segmen 9-Box ini"
            description="Pilih sel lain atau hapus filter matriks."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-5">Karyawan</th>
                  <th className="py-2.5 px-4">Klasifikasi 9-Box</th>
                  <th className="py-2.5 px-4 text-right">Capaian KPI</th>
                  <th className="py-2.5 px-4 text-right">Kompetensi</th>
                  <th className="py-2.5 px-4 text-right">Skor Komposit</th>
                  <th className="py-2.5 px-5 text-right">Status KPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {displayedEmployees.map((s) => (
                  <tr
                    key={s.employee.id}
                    onClick={() => onSelectEmployee(s.employee.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-5">
                      <div className="font-medium text-slate-900">{s.employee.name}</div>
                      <div className="text-xs text-slate-500">
                        {s.employee.department} · {s.employee.role}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium text-slate-700">
                      {s.nineBoxLabel}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-900 tabular-nums">
                      {s.weightedAttainmentPct}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {s.employee.competencyScore.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-blue-700 tabular-nums">
                      {s.finalRating.toFixed(2)} / 5,0
                    </td>
                    <td className="py-2.5 px-5 text-right">
                      <KpiStatusLabel status={s.overallStatus} />
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
