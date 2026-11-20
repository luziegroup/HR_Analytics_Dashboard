import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ComputedEmployeeScore,
  ComputedKpi,
  MonthlyScheduleConfig,
  MonthlySummaryReport,
} from '@/types/kpi';
import {
  buildMonthlySummaryReport,
  createSeededMonthlyReports,
  formatMonthKey,
  formatMonthLabel,
  shouldTriggerMonthlySchedule,
} from '@/utils/monthlyReportScheduler';
import { generateDepartmentalPerformancePdf } from '@/utils/pdfReport';

const SCHEDULE_CONFIG_KEY = 'luzie_monthly_schedule_config';
const REPORT_ARCHIVE_KEY = 'luzie_monthly_reports_archive';

const DEFAULT_SCHEDULE_CONFIG: MonthlyScheduleConfig = {
  enabled: true,
  runHour: 9,
  departmentScope: 'All',
  autoDownloadPdf: false,
};

export function useMonthlyReports(
  allScores: ComputedEmployeeScore[],
  allKpis: ComputedKpi[],
  datasetLabel: string,
) {
  const [scheduleConfig, setScheduleConfig] = useState<MonthlyScheduleConfig>(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_CONFIG_KEY);
      return raw
        ? { ...DEFAULT_SCHEDULE_CONFIG, ...(JSON.parse(raw) as Partial<MonthlyScheduleConfig>) }
        : DEFAULT_SCHEDULE_CONFIG;
    } catch {
      return DEFAULT_SCHEDULE_CONFIG;
    }
  });

  const [reports, setReports] = useState<MonthlySummaryReport[]>(() => {
    try {
      const raw = localStorage.getItem(REPORT_ARCHIVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MonthlySummaryReport[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to seeded archive
    }
    return createSeededMonthlyReports(allScores, allKpis);
  });

  useEffect(() => {
    try {
      localStorage.setItem(SCHEDULE_CONFIG_KEY, JSON.stringify(scheduleConfig));
    } catch {
      // Ignore storage errors
    }
  }, [scheduleConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(REPORT_ARCHIVE_KEY, JSON.stringify(reports));
    } catch {
      // Ignore storage errors
    }
  }, [reports]);

  const runMonthlySummary = useCallback(
    (trigger: MonthlySummaryReport['trigger'] = 'Manual Run', forcePdf = false) => {
      const now = new Date();
      const newReport = buildMonthlySummaryReport(allScores, allKpis, {
        monthKey: formatMonthKey(now),
        monthLabel: formatMonthLabel(now),
        trigger,
        scopeDepartment: scheduleConfig.departmentScope,
        generatedAt: now.toISOString(),
        read: false,
      });

      setReports((prev) => [newReport, ...prev]);

      if (forcePdf || (trigger === 'Scheduled (1st of Month)' && scheduleConfig.autoDownloadPdf)) {
        const scopedScores =
          scheduleConfig.departmentScope === 'All'
            ? allScores
            : allScores.filter(
                (s) => s.employee.department === scheduleConfig.departmentScope,
              );
        const scopedKpis =
          scheduleConfig.departmentScope === 'All'
            ? allKpis
            : allKpis.filter((k) => k.department === scheduleConfig.departmentScope);

        generateDepartmentalPerformancePdf({
          scores: scopedScores,
          kpis: scopedKpis,
          selectedDepartment: scheduleConfig.departmentScope,
          selectedCategory: 'All',
          datasetLabel,
        });
      }

      return newReport;
    },
    [allScores, allKpis, scheduleConfig, datasetLabel],
  );

  // Background check on mount + every 60s for 1st-of-month automatic report generation
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      if (shouldTriggerMonthlySchedule(scheduleConfig, reports, now)) {
        runMonthlySummary('Scheduled (1st of Month)');
      }
    };

    checkSchedule();
    const timer = window.setInterval(checkSchedule, 60_000);
    return () => window.clearInterval(timer);
  }, [scheduleConfig, reports, runMonthlySummary]);

  const updateScheduleConfig = useCallback(
    (patch: Partial<MonthlyScheduleConfig>) => {
      setScheduleConfig((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const markReportRead = useCallback((reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, read: true } : r)),
    );
  }, []);

  const markAllReportsRead = useCallback(() => {
    setReports((prev) => prev.map((r) => ({ ...r, read: true })));
  }, []);

  const unreadReports = useMemo(
    () => reports.filter((r) => !r.read),
    [reports],
  );

  return {
    scheduleConfig,
    updateScheduleConfig,
    reports,
    unreadReports,
    runMonthlySummary,
    markReportRead,
    markAllReportsRead,
  };
}
