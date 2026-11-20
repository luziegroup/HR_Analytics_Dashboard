import type { ComputedKpi, KpiCategory, KpiMetric, PerformancePeriod } from '@/types/kpi';

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCategory(raw: string | undefined): KpiCategory {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('qual')) return 'Quality';
  if (v.includes('eff')) return 'Efficiency';
  if (v.includes('grow')) return 'Growth';
  return 'Output';
}

function parseUnit(raw: string | undefined): KpiMetric['unit'] {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('usd') || v.includes('$') || v.includes('rev')) return 'USD';
  if (v.includes('day')) return 'days';
  if (v.includes('score')) return 'score';
  if (v.includes('count') || v.includes('num')) return 'count';
  return '%';
}

export function parseKpisFromCsv(csvText: string): {
  kpis: KpiMetric[];
  warnings: string[];
} {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('Berkas CSV harus berisi baris header dan minimal satu baris data KPI.');
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const findCol = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const idxId = findCol('id', 'kpiid', 'idkpi');
  const idxEmpId = findCol('employeeid', 'empid', 'idkaryawan');
  const idxEmp = findCol('employeename', 'employee', 'owner', 'name', 'namakaryawan', 'pemilik');
  const idxDept = findCol('department', 'dept', 'team', 'departemen', 'divisi');
  const idxTitle = findCol('kpititle', 'title', 'kpi', 'metric', 'namakpi', 'indikator');
  const idxCat = findCol('category', 'type', 'kategori');
  const idxUnit = findCol('unit', 'satuan');
  const idxWeight = findCol('weight', 'weightpct', 'bobot');
  const idxTarget = findCol('target', 'goal');
  const idxActual = findCol('actual', 'achieved', 'result', 'aktual', 'realisasi');
  const idxInverse = findCol('inverse', 'lowerisbetter');
  const idxPeriod = findCol('period', 'quarter', 'cycle', 'periode');

  if (idxTitle === -1 || idxTarget === -1 || idxActual === -1) {
    throw new Error(
      'CSV minimal harus memiliki kolom KPI Title (Judul KPI), Target, dan Actual (Aktual).',
    );
  }

  const warnings: string[] = [];
  const kpis: KpiMetric[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.every((c) => !c)) continue;

    const title = cells[idxTitle];
    const target = Number((cells[idxTarget] ?? '').replace(/[^0-9.-]/g, ''));
    const actual = Number((cells[idxActual] ?? '').replace(/[^0-9.-]/g, ''));
    if (!title || !Number.isFinite(target) || !Number.isFinite(actual)) {
      warnings.push(`Baris ${i + 1} dilewati: Judul KPI, Target, atau Aktual tidak valid.`);
      continue;
    }

    const weightRaw = idxWeight >= 0 ? Number(cells[idxWeight]) : 35;
    const empName = idxEmp >= 0 && cells[idxEmp] ? cells[idxEmp] : `Pemilik ${i}`;

    kpis.push({
      id: idxId >= 0 && cells[idxId] ? cells[idxId] : `KPI-${500 + i}`,
      employeeId:
        idxEmpId >= 0 && cells[idxEmpId]
          ? cells[idxEmpId]
          : `EMP-${1000 + ((i - 1) % 18) + 1}`,
      employeeName: empName,
      department: idxDept >= 0 && cells[idxDept] ? cells[idxDept] : 'Operations',
      title,
      category: parseCategory(idxCat >= 0 ? cells[idxCat] : undefined),
      unit: parseUnit(idxUnit >= 0 ? cells[idxUnit] : undefined),
      inverse:
        idxInverse >= 0
          ? ['true', '1', 'yes', 'ya'].includes(cells[idxInverse].toLowerCase())
          : false,
      weight: Number.isFinite(weightRaw) && weightRaw > 0 ? weightRaw : 35,
      target,
      actual,
      period:
        (idxPeriod >= 0 && cells[idxPeriod]
          ? (cells[idxPeriod] as PerformancePeriod)
          : 'Q4 2026'),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  }

  if (kpis.length === 0) {
    throw new Error('Tidak ada baris KPI yang valid untuk diproses dari berkas CSV ini.');
  }

  return { kpis, warnings };
}

export function exportKpisToCsv(
  kpis: ComputedKpi[],
  filename = 'kpi-performance-scorecard.csv',
) {
  const headers = [
    'KPI ID',
    'Employee ID',
    'Employee Name',
    'Department',
    'KPI Title',
    'Category',
    'Unit',
    'Inverse',
    'Weight (%)',
    'Target',
    'Actual',
    'Attainment (%)',
    'Status',
    'Period',
    'Updated At',
  ];

  const escape = (val: string | number | boolean | undefined) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = kpis.map((k) =>
    [
      k.id,
      k.employeeId,
      k.employeeName,
      k.department,
      k.title,
      k.category,
      k.unit,
      Boolean(k.inverse),
      k.weight,
      k.target,
      k.actual,
      k.attainmentPct,
      k.status,
      k.period,
      k.updatedAt,
    ]
      .map(escape)
      .join(','),
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
