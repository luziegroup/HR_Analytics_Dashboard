import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  X,
} from 'lucide-react';
import type { DownwardTrendKpi } from '@/utils/kpiAnalytics';

interface DownwardTrendAlertProps {
  items: DownwardTrendKpi[];
  onInspectOwner: (employeeId: string) => void;
  onNavigateScorecard: () => void;
}

export const DownwardTrendAlert: React.FC<DownwardTrendAlertProps> = ({
  items,
  onInspectOwner,
  onNavigateScorecard,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed || items.length === 0) return null;

  const criticalCount = items.filter((i) => i.severity === 'Critical').length;
  const visibleItems = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <section
      role="status"
      aria-label="Peringatan tren KPI menurun"
      className="bg-white border border-red-200 rounded-xl overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-red-50/60 border-b border-red-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-red-100/80 text-red-700 shrink-0">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h2 className="text-sm font-semibold text-slate-900">
                Peringatan Tren Menurun KPI 3 Bulan
              </h2>
              <span className="text-xs font-mono text-red-700 font-medium tabular-nums">
                {items.length} KPI menurun
                {criticalCount > 0 ? ` · ${criticalCount} kritis` : ''}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              KPI dengan penurunan capaian konsisten selama 3 bulan terakhir sebesar 8+ poin persentase (Sep – Nov 2026)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateScorecard}
            className="px-3 py-1.5 text-xs font-medium text-red-800 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Tinjau di Kartu Skor
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Tutup notifikasi tren menurun"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-red-100/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Flagged KPI Items */}
      <div className="divide-y divide-slate-100">
        {visibleItems.map((item) => {
          const { kpi, series, threeMonthChangePts, severity } = item;
          const isCritical = severity === 'Critical';
          return (
            <div
              key={kpi.id}
              onClick={() => onInspectOwner(kpi.employeeId)}
              className="px-5 py-3 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isCritical ? 'text-red-600' : 'text-amber-600'
                    }`}
                  />
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {kpi.title}
                  </span>
                </div>
                <div className="mt-0.5 pl-5.5 text-xs text-slate-500">
                  {kpi.employeeName} · {kpi.department} ·{' '}
                  <span className="font-mono">{kpi.id}</span>
                </div>
              </div>

              {/* 3-Month Trajectory Mini Progression */}
              <div className="flex items-center gap-5 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-500 tabular-nums">
                  {series.map((pt, idx) => (
                    <React.Fragment key={pt.month}>
                      <span
                        className={
                          idx === series.length - 1
                            ? 'font-semibold text-slate-900'
                            : ''
                        }
                      >
                        {pt.month} {pt.value}%
                      </span>
                      {idx < series.length - 1 && (
                        <span className="text-slate-300" aria-hidden="true">
                          →
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="text-right font-mono tabular-nums">
                  <div
                    className={`text-xs font-semibold ${
                      isCritical ? 'text-red-700' : 'text-amber-700'
                    }`}
                  >
                    {threeMonthChangePts} poin (3B)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isCritical ? 'Kritis' : 'Peringatan'} · Kini {kpi.attainmentPct}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse Footer */}
      {hasMore && (
        <div className="px-5 py-2.5 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Klik salah satu KPI untuk memeriksa kartu skor pemilik dan memperbarui realisasi
          </span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap cursor-pointer"
          >
            {expanded ? (
              <>
                Tampilkan lebih sedikit
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Tampilkan semua {items.length} peringatan
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};
