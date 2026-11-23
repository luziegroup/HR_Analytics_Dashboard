import { KPI_DEFINITIONS } from '@/config/kpiDefinitions';

/** Daftar KPI beserta bobot dan apa yang dicek di file KPI rinci. Hanya rujukan, bukan isian. */
export function KpiReferenceList({ employeeId, title }: { employeeId: string; title: string }) {
  const defs = KPI_DEFINITIONS.filter((d) => d.employeeId === employeeId);
  return (
    <details className="text-xs text-slate-600">
      <summary className="cursor-pointer text-blue-700">{title}</summary>
      <div className="mt-2 overflow-x-auto bg-slate-50 rounded-lg p-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pr-3 pb-1">KPI</th>
              <th className="pr-3 pb-1">Bobot</th>
              <th className="pb-1">Yang dicek di file KPI</th>
            </tr>
          </thead>
          <tbody>
            {defs.map((d) => (
              <tr key={d.id} className="align-top border-t border-slate-200">
                <td className="pr-3 py-1.5 font-medium text-slate-800">{d.no}. {d.title}</td>
                <td className="pr-3 py-1.5 tabular-nums">{Math.round(d.weight * 100)}%</td>
                <td className="py-1.5">{d.perfect}. Bukti: {d.evidence}.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
