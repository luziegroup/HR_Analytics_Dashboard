import { useCallback, useState } from 'react';
import { PerformanceDrawer } from '@/components/employee/PerformanceDrawer';
import { FilterBar } from '@/components/layout/FilterBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { NAV_ITEMS } from '@/config/navigation';
import { CalibrationView } from '@/features/calibration/CalibrationView';
import { ImportKpiView } from '@/features/import/ImportKpiView';
import { PerformanceMatrixView } from '@/features/matrix/PerformanceMatrixView';
import { PerformanceOverviewView } from '@/features/overview/PerformanceOverviewView';
import { MonthlyReportsView } from '@/features/reports/MonthlyReportsView';
import { KpiScorecardView } from '@/features/scorecard/KpiScorecardView';
import { useKpiDashboard } from '@/hooks/useKpiDashboard';
import { useMonthlyReports } from '@/hooks/useMonthlyReports';
import type { KpiView, MonthlySummaryReport } from '@/types/kpi';
import { exportKpisToCsv } from '@/utils/kpiCsv';
import { generateDepartmentalPerformancePdf } from '@/utils/pdfReport';

export function App() {
  const {
    employees,
    kpis,
    allEnrichedKpis,
    allEmployeeScores,
    enrichedFilteredKpis,
    employeeScores,
    datasetLabel,
    isCustomDataset,
    activeView,
    setActiveView,
    selectedDept,
    setSelectedDept,
    selectedCategory,
    setSelectedCategory,
    departments,
    resetFilters,
    inspectedScore,
    setInspectedEmployeeId,
    updateKpiActual,
    addKpiMetric,
    updateEmployeeReview,
    loadCustomKpiDataset,
    resetToBaselineDataset,
  } = useKpiDashboard();

  const {
    scheduleConfig,
    updateScheduleConfig,
    reports,
    unreadReports,
    runMonthlySummary,
    markReportRead,
    markAllReportsRead,
  } = useMonthlyReports(allEmployeeScores, allEnrichedKpis, datasetLabel);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const activeNav = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0];

  const handleSelectView = useCallback(
    (view: KpiView) => {
      setActiveView(view);
      setMobileMenuOpen(false);
    },
    [setActiveView],
  );

  const handleDownloadMonthlyPdf = useCallback(
    (report: MonthlySummaryReport) => {
      const scopedScores =
        report.scopeDepartment === 'All'
          ? allEmployeeScores
          : allEmployeeScores.filter(
              (s) => s.employee.department === report.scopeDepartment,
            );
      const scopedKpis =
        report.scopeDepartment === 'All'
          ? allEnrichedKpis
          : allEnrichedKpis.filter((k) => k.department === report.scopeDepartment);

      generateDepartmentalPerformancePdf({
        scores: scopedScores,
        kpis: scopedKpis,
        selectedDepartment: report.scopeDepartment,
        selectedCategory: 'All',
        datasetLabel: `${datasetLabel} (${report.monthLabel})`,
      });
    },
    [allEmployeeScores, allEnrichedKpis, datasetLabel],
  );

  const handleViewMonthlyReport = useCallback(
    (reportId: string) => {
      markReportRead(reportId);
      setSelectedReportId(reportId);
      handleSelectView('reports');
    },
    [markReportRead, handleSelectView],
  );

  const handleSelectMonthlyReport = useCallback(
    (reportId: string) => {
      markReportRead(reportId);
      setSelectedReportId(reportId);
    },
    [markReportRead],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        activeView={activeView}
        onSelectView={handleSelectView}
        datasetLabel={datasetLabel}
        totalKpis={kpis.length}
        totalEmployees={employees.length}
        unreadReportCount={unreadReports.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          title={activeNav.label}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onExportCsv={() => exportKpisToCsv(enrichedFilteredKpis)}
          onDownloadPdf={() =>
            generateDepartmentalPerformancePdf({
              scores: employeeScores,
              kpis: enrichedFilteredKpis,
              selectedDepartment: selectedDept,
              selectedCategory,
              datasetLabel,
            })
          }
        />

        {activeNav.showGlobalFilters && (
          <FilterBar
            departments={departments}
            selectedDept={selectedDept}
            selectedCategory={selectedCategory}
            onDeptChange={setSelectedDept}
            onCategoryChange={setSelectedCategory}
            onReset={resetFilters}
            filteredKpiCount={enrichedFilteredKpis.length}
            totalKpiCount={kpis.length}
          />
        )}

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeView === 'overview' && (
            <PerformanceOverviewView
              scores={employeeScores}
              kpis={enrichedFilteredKpis}
              onSelectEmployee={setInspectedEmployeeId}
              onNavigateScorecard={() => handleSelectView('scorecard')}
              unreadReports={unreadReports}
              onViewMonthlyReport={handleViewMonthlyReport}
              onDownloadMonthlyPdf={handleDownloadMonthlyPdf}
              onDismissMonthlyReport={markReportRead}
            />
          )}
          {activeView === 'scorecard' && (
            <KpiScorecardView
              kpis={enrichedFilteredKpis}
              employees={employees}
              onSelectEmployee={setInspectedEmployeeId}
              onUpdateKpiActual={updateKpiActual}
              onAddKpi={addKpiMetric}
            />
          )}
          {activeView === 'matrix' && (
            <PerformanceMatrixView
              scores={employeeScores}
              onSelectEmployee={setInspectedEmployeeId}
            />
          )}
          {activeView === 'calibration' && (
            <CalibrationView
              scores={employeeScores}
              onSelectEmployee={setInspectedEmployeeId}
              onUpdateReview={updateEmployeeReview}
            />
          )}
          {activeView === 'reports' && (
            <MonthlyReportsView
              scheduleConfig={scheduleConfig}
              onUpdateSchedule={updateScheduleConfig}
              departments={departments}
              reports={reports}
              selectedReportId={selectedReportId}
              onSelectReport={handleSelectMonthlyReport}
              onRunNow={() => runMonthlySummary('Manual Run')}
              onMarkAllRead={markAllReportsRead}
              onDownloadPdf={handleDownloadMonthlyPdf}
            />
          )}
          {activeView === 'import' && (
            <ImportKpiView
              currentKpis={enrichedFilteredKpis}
              isCustomDataset={isCustomDataset}
              onDatasetLoaded={loadCustomKpiDataset}
              onResetDataset={resetToBaselineDataset}
            />
          )}
        </main>
      </div>

      <PerformanceDrawer
        score={inspectedScore}
        onClose={() => setInspectedEmployeeId(null)}
        onUpdateKpiActual={updateKpiActual}
        onUpdateReview={updateEmployeeReview}
      />
    </div>
  );
}

export default App;
