import { useCallback, useMemo, useState } from 'react';
import { INITIAL_EMPLOYEES_PERF, INITIAL_KPIS } from '@/data/kpiDataset';
import type {
  ComputedEmployeeScore,
  EmployeePerformance,
  KpiCategory,
  KpiMetric,
  KpiView,
  ReviewStatus,
} from '@/types/kpi';
import { computeEmployeeScores, enrichKpi } from '@/utils/kpiAnalytics';

const DEFAULT_DATASET_LABEL = 'Siklus Kinerja Q4 2026';

export function useKpiDashboard() {
  const [employees, setEmployees] = useState<EmployeePerformance[]>(INITIAL_EMPLOYEES_PERF);
  const [kpis, setKpis] = useState<KpiMetric[]>(INITIAL_KPIS);
  const [datasetLabel, setDatasetLabel] = useState(DEFAULT_DATASET_LABEL);
  const [isCustomDataset, setIsCustomDataset] = useState(false);

  const [activeView, setActiveView] = useState<KpiView>('overview');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<'All' | KpiCategory>('All');
  const [inspectedEmployeeId, setInspectedEmployeeId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const set = new Set([
      ...employees.map((e) => e.department),
      ...kpis.map((k) => k.department),
    ]);
    return ['All', ...Array.from(set).sort()];
  }, [employees, kpis]);

  const filteredRawKpis = useMemo(() => {
    return kpis.filter((k) => {
      if (selectedDept !== 'All' && k.department !== selectedDept) return false;
      if (selectedCategory !== 'All' && k.category !== selectedCategory) return false;
      return true;
    });
  }, [kpis, selectedDept, selectedCategory]);

  const enrichedFilteredKpis = useMemo(
    () => filteredRawKpis.map(enrichKpi),
    [filteredRawKpis],
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) =>
      selectedDept === 'All' ? true : e.department === selectedDept,
    );
  }, [employees, selectedDept]);

  const employeeScores: ComputedEmployeeScore[] = useMemo(() => {
    return computeEmployeeScores(filteredEmployees, filteredRawKpis);
  }, [filteredEmployees, filteredRawKpis]);

  const allEnrichedKpis = useMemo(() => kpis.map(enrichKpi), [kpis]);

  const allEmployeeScores: ComputedEmployeeScore[] = useMemo(() => {
    return computeEmployeeScores(employees, kpis);
  }, [employees, kpis]);

  const inspectedScore = useMemo(() => {
    if (!inspectedEmployeeId) return null;
    return (
      allEmployeeScores.find((s) => s.employee.id === inspectedEmployeeId) ?? null
    );
  }, [allEmployeeScores, inspectedEmployeeId]);

  const updateKpiActual = useCallback((kpiId: string, newActual: number) => {
    if (!Number.isFinite(newActual) || newActual < 0) return;
    const today = new Date().toISOString().slice(0, 10);
    setKpis((prev) =>
      prev.map((k) =>
        k.id === kpiId ? { ...k, actual: newActual, updatedAt: today } : k,
      ),
    );
  }, []);

  const addKpiMetric = useCallback(
    (payload: Omit<KpiMetric, 'id' | 'updatedAt'>) => {
      const id = `KPI-${String(kpis.length + 101).padStart(3, '0')}`;
      const today = new Date().toISOString().slice(0, 10);
      setKpis((prev) => [{ ...payload, id, updatedAt: today }, ...prev]);
    },
    [kpis.length],
  );

  const updateEmployeeReview = useCallback(
    (employeeId: string, status: ReviewStatus, competencyScore?: number) => {
      const today = new Date().toISOString().slice(0, 10);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? {
                ...e,
                reviewStatus: status,
                competencyScore:
                  competencyScore !== undefined
                    ? Number(Math.min(5, Math.max(1, competencyScore)).toFixed(1))
                    : e.competencyScore,
                lastReviewDate: today,
              }
            : e,
        ),
      );
    },
    [],
  );

  const loadCustomKpiDataset = useCallback((newKpis: KpiMetric[], fileName: string) => {
    // Derive employee performance shells for any new owners in uploaded CSV
    const ownerMap = new Map<string, EmployeePerformance>();
    for (const emp of INITIAL_EMPLOYEES_PERF) {
      ownerMap.set(emp.id, emp);
    }
    for (const k of newKpis) {
      if (!ownerMap.has(k.employeeId)) {
        ownerMap.set(k.employeeId, {
          id: k.employeeId,
          name: k.employeeName,
          role: 'Pemilik KPI',
          department: k.department,
          level: 'L3',
          manager: 'Kepala Departemen',
          competencyScore: 4.0,
          selfReviewScore: 4.0,
          reviewStatus: 'Manager Review',
          lastReviewDate: k.updatedAt,
        });
      }
    }
    const activeIds = new Set(newKpis.map((k) => k.employeeId));
    setEmployees(Array.from(ownerMap.values()).filter((e) => activeIds.has(e.id)));
    setKpis(newKpis);
    setDatasetLabel(fileName);
    setIsCustomDataset(true);
    setSelectedDept('All');
    setSelectedCategory('All');
  }, []);

  const resetToBaselineDataset = useCallback(() => {
    setEmployees(INITIAL_EMPLOYEES_PERF);
    setKpis(INITIAL_KPIS);
    setDatasetLabel(DEFAULT_DATASET_LABEL);
    setIsCustomDataset(false);
    setSelectedDept('All');
    setSelectedCategory('All');
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedDept('All');
    setSelectedCategory('All');
  }, []);

  return {
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
  };
}
