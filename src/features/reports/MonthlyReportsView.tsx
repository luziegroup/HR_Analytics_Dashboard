import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  FileDown,
  Play,
  TrendingDown,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import type {
  MonthlyScheduleConfig,
  MonthlySummaryReport,
} from '@/types/kpi';
import { getNextFirstOfMonthRun } from '@/utils/monthlyReportScheduler';

interface MonthlyReportsViewProps {
  scheduleConfig: MonthlyScheduleConfig;
  onUpdateSchedule: (patch: Partial<MonthlyScheduleConfig>) => void;
  departments: string[];
  reports: MonthlySummaryReport[];
  selectedReportId: string | null;
  onSelectReport: (reportId: string) => void;
  onRunNow: () => MonthlySummaryReport;
  onMarkAllRead: () => void;
  onDownloadPdf: (report: MonthlySummaryReport) => void;
}

const RUN_HOUR_OPTIONS = [
  { value: 8, label: '08:00 Lokal' },
  { value: 9, label: '09:00 Lokal' },
  { value: 12, label: '12:00 Lokal' },
  { value: 17, label: '17:00 Lokal' },
];

const formatTriggerLabel = (trigger: MonthlySummaryReport['trigger']) =>
  trigger === 'Scheduled (1st of Month)'
    ? 'Terjadwal (Tgl 1)'
    : 'Dijalankan Manual';

export const MonthlyReportsView: React.FC<MonthlyReportsViewProps> = ({
  scheduleConfig,
  onUpdateSchedule,
  departments,
  reports,
  selectedReportId,
  onSelectReport,
  onRunNow,
  onMarkAllRead,
  onDownloadPdf,
}) => {
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(
    selectedReportId ?? reports[0]?.id ?? null,
  );
  const [runFeedback, setRunFeedback] = useState<string | null>(null);

  const activeReportId = selectedReportId ?? localSelectedId ?? reports[0]?.id ?? null;
  const activeReport = useMemo(
    () => reports.find((r) => r.id === activeReportId) ?? reports[0] ?? null,
    [reports, activeReportId],
  );

  const unreadCount = useMemo(
    () => reports.filter((r) => !r.read).length,
    [reports],
  );

  const nextRunDate = useMemo(
    () => getNextFirstOfMonthRun(scheduleConfig.runHour),
    [scheduleConfig.runHour],
  );

  const nextRunFormatted = nextRunDate.toLocaleString('id-ID', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRunNow = () => {
    const generated = onRunNow();
    setLocalSelectedId(generated.id);
    onSelectReport(generated.id);
    setRunFeedback(
      `Laporan ${generated.monthLabel} berhasil dibuat (rata-rata capaian ${generated.avgAttainmentPct}%).`,
    );
  };

  const handleChooseReport = (reportId: string) => {
    setLocalSelectedId(reportId);
    onSelectReport(reportId);
  };

  return (
    <div className="space-y-6">
      {/* Schedule Configuration */}
      <SectionCard
        title="Jadwal Ringkasan Otomatis Tanggal 1"
        subtitle="Menyusun rekap pencapaian KPI departemen, indeks komposit, dan sorotan tren penurunan 3 bulan secara otomatis setiap tanggal 1"
        action={
          <button
            type="button"
            onClick={handleRunNow}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Buat Ringkasan Sekarang
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <label
              htmlFor="schedule-enabled"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Status Otomatisasi
            </label>
            <button
              id="schedule-enabled"
              type="button"
              role="switch"
              aria-checked={scheduleConfig.enabled}
              onClick={() =>
                onUpdateSchedule({ enabled: !scheduleConfig.enabled })
              }
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                scheduleConfig.enabled
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span>
                {scheduleConfig.enabled ? 'Aktif · Tanggal 1' : 'Dijeda'}
              </span>
              <span className="font-mono text-[11px] uppercase">
                {scheduleConfig.enabled ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </button>
          </div>

          <div>
            <label
              htmlFor="schedule-run-hour"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Jam Eksekusi (Tanggal 1)
            </label>
            <select
              id="schedule-run-hour"
              value={scheduleConfig.runHour}
              onChange={(e) =>
                onUpdateSchedule({ runHour: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              {RUN_HOUR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="schedule-dept-scope"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Cakupan Departemen
            </label>
            <select
              id="schedule-dept-scope"
              value={scheduleConfig.departmentScope}
              onChange={(e) =>
                onUpdateSchedule({ departmentScope: e.target.value })
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'Semua Departemen' : dept}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-between">
            <span className="block text-xs font-medium text-slate-600 mb-1.5">
              Pengiriman PDF
            </span>
            <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleConfig.autoDownloadPdf}
                onChange={(e) =>
                  onUpdateSchedule({ autoDownloadPdf: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Unduh PDF otomatis tiap tgl 1</span>
            </label>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <CalendarClock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Jadwal berikutnya:{' '}
              <strong className="text-slate-900 font-semibold">
                {scheduleConfig.enabled ? nextRunFormatted : 'Dinonaktifkan'}
              </strong>
            </span>
            <span className="text-slate-400">·</span>
            <span>Cron: 0 {scheduleConfig.runHour} 1 * *</span>
          </div>
          {runFeedback && (
            <span className="text-emerald-700 font-medium">{runFeedback}</span>
          )}
        </div>
      </SectionCard>

      {/* Archive & Report Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <SectionCard
          title="Arsip Laporan Bulanan"
          subtitle={`${reports.length} laporan tersimpan`}
          className="lg:col-span-4"
          noPadding
          action={
            unreadCount > 0 ? (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tandai dibaca ({unreadCount})
              </button>
            ) : undefined
          }
        >
          {reports.length === 0 ? (
            <EmptyState
              title="Belum ada laporan bulanan"
              description="Jalankan rekap bulanan secara manual atau tunggu jadwal otomatis tanggal 1."
            />
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {reports.map((report) => {
                const isSelected = activeReport?.id === report.id;
                const scopeText =
                  report.scopeDepartment === 'All'
                    ? 'Semua Departemen'
                    : report.scopeDepartment;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => handleChooseReport(report.id)}
                    className={`w-full text-left px-5 py-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70'
                        : 'hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {report.monthLabel}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums shrink-0">
                        {report.avgAttainmentPct}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">
                        {formatTriggerLabel(report.trigger)} · {scopeText}
                      </span>
                      {!report.read && (
                        <span className="text-blue-700 font-medium shrink-0">
                          Baru
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-slate-400 tabular-nums">
                      {new Date(report.generatedAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      · {report.downwardAlertCount} peringatan tren turun
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="lg:col-span-8 space-y-6">
          {!activeReport ? (
            <SectionCard title="Detail Laporan">
              <EmptyState
                title="Pilih laporan dari arsip"
                description="Pilih salah satu ringkasan bulanan di sebelah kiri untuk meninjau rincian KPI departemen dan mengunduh PDF."
              />
            </SectionCard>
          ) : (
            <SectionCard
              title={`Ringkasan Departemen ${activeReport.monthLabel}`}
              subtitle={`Dibuat ${new Date(activeReport.generatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} · ${formatTriggerLabel(activeReport.trigger)} · Cakupan: ${activeReport.scopeDepartment === 'All' ? 'Semua Departemen' : activeReport.scopeDepartment}`}
              action={
                <button
                  type="button"
                  onClick={() => onDownloadPdf(activeReport)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Unduh PDF
                </button>
              }
            >
              {/* Executive KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/40">
                <div className="p-4">
                  <p className="text-xs text-slate-500">Rata-rata Capaian</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 font-display tabular-nums">
                    {activeReport.avgAttainmentPct}%
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-500">KPI Sesuai Target</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700 font-display tabular-nums">
                    {activeReport.onTrackRatePct}%
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-500">Indeks Komposit</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 font-display tabular-nums">
                    {activeReport.avgCompositeIndex}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-500">Peringatan Turun 3B</p>
                  <p
                    className={`mt-1 text-2xl font-semibold font-display tabular-nums ${
                      activeReport.downwardAlertCount > 0
                        ? 'text-red-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {activeReport.downwardAlertCount}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 font-mono tabular-nums">
                <span>
                  Departemen Tertinggi:{' '}
                  <strong className="text-slate-900">
                    {activeReport.topDepartment}
                  </strong>
                </span>
                <span>
                  Perlu Perhatian:{' '}
                  <strong className="text-slate-900">
                    {activeReport.attentionDepartment}
                  </strong>
                </span>
                <span>Total KPI: {activeReport.totalKpis}</span>
              </div>

              {/* Departmental Breakdown Table */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Rincian Kartu Skor per Departemen
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-2.5 px-4">Departemen</th>
                        <th className="py-2.5 px-3 text-right">Pemilik</th>
                        <th className="py-2.5 px-3 text-right">KPI</th>
                        <th className="py-2.5 px-3 text-right">Rata-rata Capaian</th>
                        <th className="py-2.5 px-3 text-right">Sesuai Target</th>
                        <th className="py-2.5 px-3 text-right">Komposit</th>
                        <th className="py-2.5 px-4 text-right">Pembinaan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {activeReport.departments.map((dept) => (
                        <tr key={dept.department} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {dept.department}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                            {dept.employeeCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                            {dept.kpiCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {dept.avgAttainmentPct}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                            {dept.onTrackRatePct}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                            {dept.avgCompositeIndex}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                            {dept.coachingNeededCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Downward Highlights */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-red-600 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Sorotan KPI Tren Menurun 3 Bulan
                  </h3>
                </div>
                {activeReport.downwardHighlights.length === 0 ? (
                  <p className="text-xs text-emerald-800 bg-emerald-50/70 border border-emerald-200 rounded-lg px-4 py-3">
                    Tidak ada KPI yang mengalami penurunan konsisten selama 3 bulan (&ge; 8 poin persentase) pada periode laporan ini.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-red-50/50 text-xs font-medium text-slate-600">
                          <th className="py-2.5 px-4">Metrik KPI</th>
                          <th className="py-2.5 px-3">Pemilik</th>
                          <th className="py-2.5 px-3">Departemen</th>
                          <th className="py-2.5 px-3 text-right">Saat Ini</th>
                          <th className="py-2.5 px-3 text-right">Penurunan 3B</th>
                          <th className="py-2.5 px-4 text-right">Tingkat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {activeReport.downwardHighlights.map((item) => (
                          <tr key={item.kpiId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              <span className="inline-flex items-center gap-1.5">
                                <AlertTriangle
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    item.severity === 'Critical'
                                      ? 'text-red-600'
                                      : 'text-amber-600'
                                  }`}
                                />
                                {item.kpiTitle}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {item.owner}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {item.department}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900 tabular-nums">
                              {item.currentAttainmentPct}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-red-700 tabular-nums">
                              {item.dropPts} poin
                            </td>
                            <td
                              className={`py-2.5 px-4 text-right font-medium ${
                                item.severity === 'Critical'
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {item.severity === 'Critical' ? 'Kritis' : 'Peringatan'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};
