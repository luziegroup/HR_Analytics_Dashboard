import React from 'react';
import { CalendarClock, FileDown, X } from 'lucide-react';
import type { MonthlySummaryReport } from '@/types/kpi';

interface MonthlyReportNotificationProps {
  unreadReports: MonthlySummaryReport[];
  onViewReport: (reportId: string) => void;
  onDownloadPdf: (report: MonthlySummaryReport) => void;
  onDismiss: (reportId: string) => void;
}

export const MonthlyReportNotification: React.FC<MonthlyReportNotificationProps> = ({
  unreadReports,
  onViewReport,
  onDownloadPdf,
  onDismiss,
}) => {
  if (unreadReports.length === 0) return null;

  const latest = unreadReports[0];
  const scopeLabel =
    latest.scopeDepartment === 'All' ? 'Semua Departemen' : latest.scopeDepartment;
  const triggerLabel =
    latest.trigger === 'Scheduled (1st of Month)'
      ? 'Terjadwal (Tgl 1)'
      : 'Dijalankan Manual';

  return (
    <section
      role="status"
      aria-label="Notifikasi laporan bulanan terjadwal"
      className="bg-white border border-blue-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-700 shrink-0">
          <CalendarClock className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Ringkasan KPI Departemen {latest.monthLabel} Siap Ditinjau
            </h2>
            <span className="text-xs font-mono text-blue-700 font-medium tabular-nums">
              {triggerLabel} · {scopeLabel}
              {unreadReports.length > 1
                ? ` · ${unreadReports.length} belum dibaca`
                : ''}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600 font-mono tabular-nums">
            Rata-rata Capaian {latest.avgAttainmentPct}% · {latest.onTrackRatePct}% Sesuai Target ·{' '}
            {latest.downwardAlertCount} Peringatan Tren Turun 3B · Terbaik: {latest.topDepartment}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onDownloadPdf(latest)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          Unduh PDF
        </button>
        <button
          type="button"
          onClick={() => onViewReport(latest.id)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Lihat Laporan
        </button>
        <button
          type="button"
          onClick={() => onDismiss(latest.id)}
          aria-label="Tutup notifikasi laporan bulanan"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
