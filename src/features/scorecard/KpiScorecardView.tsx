import React, { useMemo, useState } from 'react';
import { ArrowDownUp, Plus, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiStatusLabel } from '@/components/ui/KpiStatusLabel';
import type {
  ComputedKpi,
  EmployeePerformance,
  KpiCategory,
  KpiMetric,
  KpiStatus,
} from '@/types/kpi';
import { formatKpiValue } from '@/utils/kpiAnalytics';

interface KpiScorecardViewProps {
  kpis: ComputedKpi[];
  employees: EmployeePerformance[];
  onSelectEmployee: (employeeId: string) => void;
  onUpdateKpiActual: (kpiId: string, newActual: number) => void;
  onAddKpi: (payload: Omit<KpiMetric, 'id' | 'updatedAt'>) => void;
}

type SortKey = 'title' | 'employeeName' | 'weight' | 'attainmentPct';

const STATUS_OPTIONS: Array<{ value: 'All' | KpiStatus; label: string }> = [
  { value: 'All', label: 'Semua' },
  { value: 'Exceeded', label: 'Melampaui' },
  { value: 'On Track', label: 'Sesuai Target' },
  { value: 'At Risk', label: 'Perlu Perhatian' },
  { value: 'Off Track', label: 'Di Bawah Target' },
];

const CATEGORY_LABELS: Record<string, string> = {
  Output: 'Output',
  Quality: 'Kualitas',
  Efficiency: 'Efisiensi',
  Growth: 'Pertumbuhan',
};

export const KpiScorecardView: React.FC<KpiScorecardViewProps> = ({
  kpis,
  employees,
  onSelectEmployee,
  onUpdateKpiActual,
  onAddKpi,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | KpiStatus>('All');
  const [sortKey, setSortKey] = useState<SortKey>('attainmentPct');
  const [sortAsc, setSortAsc] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftActual, setDraftActual] = useState<string>('');

  // New KPI Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOwnerId, setNewOwnerId] = useState(employees[0]?.id ?? 'EMP-1001');
  const [newCategory, setNewCategory] = useState<KpiCategory>('Output');
  const [newUnit, setNewUnit] = useState<KpiMetric['unit']>('%');
  const [newWeight, setNewWeight] = useState('25');
  const [newTarget, setNewTarget] = useState('95');
  const [newActual, setNewActual] = useState('90');
  const [newInverse, setNewInverse] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kpis
      .filter((k) => {
        if (statusFilter !== 'All' && k.status !== statusFilter) return false;
        if (!q) return true;
        return (
          k.title.toLowerCase().includes(q) ||
          k.employeeName.toLowerCase().includes(q) ||
          k.department.toLowerCase().includes(q) ||
          k.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortAsc ? av - bv : bv - av;
        }
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
  }, [kpis, search, statusFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'title' || key === 'employeeName');
    }
  };

  const handleCreateKpi = (e: React.FormEvent) => {
    e.preventDefault();
    const owner = employees.find((emp) => emp.id === newOwnerId) ?? employees[0];
    const targetNum = Number(newTarget);
    const actualNum = Number(newActual);
    const weightNum = Number(newWeight);
    if (!newTitle.trim() || !owner || !Number.isFinite(targetNum) || targetNum <= 0) {
      return;
    }

    onAddKpi({
      employeeId: owner.id,
      employeeName: owner.name,
      department: owner.department,
      title: newTitle.trim(),
      category: newCategory,
      unit: newUnit,
      inverse: newInverse,
      weight: Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 25,
      target: targetNum,
      actual: Number.isFinite(actualNum) && actualNum >= 0 ? actualNum : 0,
      period: 'Q4 2026',
    });

    setNewTitle('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari metrik KPI, pemilik, atau departemen..."
              aria-label="Cari kartu skor KPI"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setStatusFilter(st.value)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === st.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Target KPI
            </button>
          </div>
        </div>

        {/* Inline Add KPI Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleCreateKpi}
            className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <label className="sm:col-span-2 text-xs text-slate-700 space-y-1">
              <span className="font-medium">Nama Metrik KPI</span>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="cth. Skor NPS Pelanggan Bulanan"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600"
              />
            </label>

            <label className="text-xs text-slate-700 space-y-1">
              <span className="font-medium">Pemilik KPI</span>
              <select
                value={newOwnerId}
                onChange={(e) => setNewOwnerId(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-700 space-y-1">
              <span className="font-medium">Kategori</span>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as KpiCategory)}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600"
              >
                <option value="Output">Output</option>
                <option value="Quality">Kualitas</option>
                <option value="Efficiency">Efisiensi</option>
                <option value="Growth">Pertumbuhan</option>
              </select>
            </label>

            <label className="text-xs text-slate-700 space-y-1">
              <span className="font-medium">Satuan</span>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value as KpiMetric['unit'])}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600"
              >
                <option value="%">Persentase (%)</option>
                <option value="count">Jumlah</option>
                <option value="days">Hari</option>
                <option value="USD">USD ($)</option>
                <option value="score">Skor (1-5)</option>
              </select>
            </label>

            <label className="text-xs text-slate-700 space-y-1">
              <span className="font-medium">Nilai Target</span>
              <input
                type="number"
                step="any"
                required
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-600"
              />
            </label>

            <label className="text-xs text-slate-700 space-y-1">
              <span className="font-medium">Realisasi Saat Ini</span>
              <input
                type="number"
                step="any"
                required
                value={newActual}
                onChange={(e) => setNewActual(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-600"
              />
            </label>

            <label className="text-xs text-slate-700 space-y-1">
              <span className="font-medium">Bobot (%)</span>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-600"
              />
            </label>

            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newInverse}
                  onChange={(e) => setNewInverse(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Nilai lebih rendah lebih baik (mis. waktu siklus, cacat produksi, biaya)
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Simpan Target KPI
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Scorecard Table */}
        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada target KPI yang sesuai filter"
            description="Ubah kata kunci pencarian atau hapus filter status."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Hapus filter
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-5">
                    <button
                      type="button"
                      onClick={() => toggleSort('title')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      Metrik KPI
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => toggleSort('employeeName')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      Pemilik & Dept
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('weight')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                    >
                      Bobot
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-right">Target</th>
                  <th className="py-2.5 px-4 text-right">Aktual</th>
                  <th className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('attainmentPct')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                    >
                      Capaian
                      <ArrowDownUp className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((kpi) => {
                  const isEditing = editingId === kpi.id;
                  return (
                    <tr key={kpi.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-5">
                        <div className="font-medium text-slate-900">{kpi.title}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {kpi.id} · {CATEGORY_LABELS[kpi.category] ?? kpi.category}
                          {kpi.inverse ? ' · Lebih rendah lebih baik' : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectEmployee(kpi.employeeId)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="text-xs font-medium text-blue-700 group-hover:underline">
                            {kpi.employeeName}
                          </div>
                          <div className="text-xs text-slate-500">{kpi.department}</div>
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {kpi.weight}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatKpiValue(kpi.target, kpi.unit)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              step="any"
                              value={draftActual}
                              onChange={(e) => setDraftActual(e.target.value)}
                              className="w-20 px-2 py-1 text-right text-xs border border-blue-600 rounded bg-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const v = Number(draftActual);
                                if (Number.isFinite(v) && v >= 0) {
                                  onUpdateKpiActual(kpi.id, v);
                                }
                                setEditingId(null);
                              }}
                              className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded cursor-pointer"
                            >
                              Simpan
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(kpi.id);
                              setDraftActual(String(kpi.actual));
                            }}
                            title="Klik untuk memperbarui nilai aktual"
                            className="font-medium text-slate-900 hover:text-blue-700 underline decoration-slate-300 underline-offset-2 cursor-pointer"
                          >
                            {formatKpiValue(kpi.actual, kpi.unit)}
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {kpi.attainmentPct}%
                      </td>
                      <td className="py-2.5 px-5 text-right">
                        <KpiStatusLabel status={kpi.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            Menampilkan <strong className="text-slate-800 tabular-nums">{filtered.length}</strong> dari{' '}
            <strong className="text-slate-800 tabular-nums">{kpis.length}</strong> target KPI
          </span>
          <span>Klik nilai Aktual untuk pembaruan langsung · Klik nama pemilik untuk melihat kartu skor</span>
        </div>
      </section>
    </div>
  );
};
