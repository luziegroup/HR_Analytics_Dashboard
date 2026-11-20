import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ComputedEmployeeScore, ComputedKpi, KpiCategory } from '@/types/kpi';
import {
  computeDepartmentPerformance,
  computeExecutiveKpis,
  computeMonthlyPerformanceTrend,
  detectDownwardTrendKpis,
} from '@/utils/kpiAnalytics';

export interface DepartmentalPdfOptions {
  scores: ComputedEmployeeScore[];
  kpis: ComputedKpi[];
  selectedDepartment: string;
  selectedCategory: 'All' | KpiCategory;
  datasetLabel: string;
}

export function generateDepartmentalPerformancePdf({
  scores,
  kpis,
  selectedDepartment,
  selectedCategory,
  datasetLabel,
}: DepartmentalPdfOptions): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth(); // 210mm
  const pageH = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentW = pageW - margin * 2;

  const exec = computeExecutiveKpis(scores, kpis);
  const departments = computeDepartmentPerformance(scores);
  const monthlyTrend = computeMonthlyPerformanceTrend(
    exec.avgAttainment,
    exec.avgCompositeIndex,
  );
  const downwardAlerts = detectDownwardTrendKpis(kpis);

  const scopeDept =
    selectedDepartment === 'All' ? 'Semua Departemen' : selectedDepartment;
  const categoryLabels: Record<string, string> = {
    All: 'Semua Kategori KPI',
    Output: 'Output',
    Quality: 'Kualitas',
    Efficiency: 'Efisiensi',
    Growth: 'Pertumbuhan',
  };
  const scopeCategory = categoryLabels[selectedCategory] ?? selectedCategory;
  const generatedStamp = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // ---------------------------------------------------------------------------
  // 1. Header Banner
  // ---------------------------------------------------------------------------
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text('Luzie Performance — Ringkasan KPI Departemen', margin, 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text(
    `Cakupan: ${scopeDept}  |  Kategori: ${scopeCategory}  |  Sumber: ${datasetLabel}  |  Dibuat: ${generatedStamp}`,
    margin,
    20.5,
  );

  let cursorY = 36;

  // ---------------------------------------------------------------------------
  // 2. Executive KPI Summary Strip
  // ---------------------------------------------------------------------------
  const boxGap = 4;
  const boxW = (contentW - boxGap * 3) / 4;
  const boxH = 22;
  const summaryMetrics = [
    {
      label: 'Rata-rata Capaian KPI',
      value: `${exec.avgAttainment}%`,
      sub: `${exec.totalKpis} KPI vs target 100%`,
      accent: [37, 99, 235] as [number, number, number],
    },
    {
      label: 'KPI Sesuai Target',
      value: `${exec.onTrackRate}%`,
      sub: `${exec.onTrackKpis} dari ${exec.totalKpis} >= 85%`,
      accent: [5, 150, 105] as [number, number, number],
    },
    {
      label: 'Indeks Komposit',
      value: `${exec.avgCompositeIndex}`,
      sub: `Skor rata-rata ${exec.avgFinalRating} / 5,0`,
      accent: [15, 23, 42] as [number, number, number],
    },
    {
      label: 'Peringatan Tren Turun 3B',
      value: `${downwardAlerts.length}`,
      sub: `${exec.coachingNeeded} pemilik < 80%`,
      accent:
        downwardAlerts.length > 0
          ? ([220, 38, 38] as [number, number, number])
          : ([5, 150, 105] as [number, number, number]),
    },
  ];

  summaryMetrics.forEach((m, idx) => {
    const x = margin + idx * (boxW + boxGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cursorY, boxW, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3.5, cursorY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...m.accent);
    doc.text(m.value, x + 3.5, cursorY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.sub, x + 3.5, cursorY + 19.2);
  });

  cursorY += boxH + 10;

  // ---------------------------------------------------------------------------
  // 3. Vector Chart 1: Month-over-Month Performance Trend
  // ---------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Tren Kinerja Bulan ke Bulan (12 Bulan)', margin, cursorY);

  // Legend inline right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setFillColor(37, 99, 235);
  doc.rect(pageW - margin - 66, cursorY - 2.6, 4, 1.6, 'F');
  doc.setTextColor(71, 85, 105);
  doc.text('Capaian KPI (%)', pageW - margin - 60, cursorY - 0.8);

  doc.setFillColor(5, 150, 105);
  doc.rect(pageW - margin - 31, cursorY - 2.6, 4, 1.6, 'F');
  doc.text('Indeks Komposit', pageW - margin - 25, cursorY - 0.8);

  cursorY += 4;

  const chartBoxH = 54;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, cursorY, contentW, chartBoxH, 1.5, 1.5, 'FD');

  const plotX = margin + 12;
  const plotY = cursorY + 6;
  const plotW = contentW - 18;
  const plotH = chartBoxH - 16;
  const minY = 60;
  const maxY = 115;

  const toY = (val: number) =>
    plotY + plotH - ((Math.min(maxY, Math.max(minY, val)) - minY) / (maxY - minY)) * plotH;

  // Y gridlines
  [60, 75, 90, 100, 115].forEach((tick) => {
    const y = toY(tick);
    doc.setDrawColor(tick === 100 ? 148 : 226, tick === 100 ? 163 : 232, tick === 100 ? 184 : 240);
    doc.setLineWidth(tick === 100 ? 0.35 : 0.2);
    if (tick === 100) {
      doc.setLineDashPattern([1.5, 1.5], 0);
    } else {
      doc.setLineDashPattern([], 0);
    }
    doc.line(plotX, y, plotX + plotW, y);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${tick}%`, plotX - 2, y + 1, { align: 'right' });
  });

  // Draw Attainment & Composite lines
  const drawSeries = (
    values: number[],
    color: [number, number, number],
    lineWidth: number,
  ) => {
    doc.setDrawColor(...color);
    doc.setFillColor(...color);
    doc.setLineWidth(lineWidth);

    const coords = values.map((v, i) => ({
      x: plotX + (i / Math.max(1, values.length - 1)) * plotW,
      y: toY(v),
    }));

    for (let i = 0; i < coords.length - 1; i++) {
      doc.line(coords[i].x, coords[i].y, coords[i + 1].x, coords[i + 1].y);
    }
    coords.forEach((pt) => {
      doc.circle(pt.x, pt.y, 0.85, 'F');
    });
  };

  drawSeries(
    monthlyTrend.map((m) => m.compositeIndex),
    [5, 150, 105],
    0.55,
  );
  drawSeries(
    monthlyTrend.map((m) => m.attainment),
    [37, 99, 235],
    0.7,
  );

  // X-axis month labels
  monthlyTrend.forEach((m, idx) => {
    const x = plotX + (idx / Math.max(1, monthlyTrend.length - 1)) * plotW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.month.split(' ')[0], x, plotY + plotH + 5, { align: 'center' });
  });

  cursorY += chartBoxH + 9;

  // ---------------------------------------------------------------------------
  // 4. Vector Chart 2: Departmental Performance Bar Chart
  // ---------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Perbandingan Pencapaian KPI Antar Departemen', margin, cursorY);
  cursorY += 4;

  const rowH = 8.5;
  const barChartH = Math.max(20, departments.length * rowH + 10);
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, cursorY, contentW, barChartH, 1.5, 1.5, 'FD');

  const labelW = 34;
  const valueW = 40;
  const barAreaX = margin + labelW;
  const barAreaW = contentW - labelW - valueW - 6;
  const maxBarScale = 120;

  // 100% Target vertical guide
  const targetLineX = barAreaX + (100 / maxBarScale) * barAreaW;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(targetLineX, cursorY + 3, targetLineX, cursorY + barChartH - 4);
  doc.setLineDashPattern([], 0);

  departments.forEach((dept, idx) => {
    const y = cursorY + 7 + idx * rowH;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(dept.department, margin + 4, y + 2.2);

    // Track background
    doc.setFillColor(241, 245, 249);
    doc.rect(barAreaX, y - 1.2, barAreaW, 4, 'F');

    // Filled bar
    const fillW = Math.min(barAreaW, (dept.avgAttainmentPct / maxBarScale) * barAreaW);
    if (dept.avgAttainmentPct >= 100) {
      doc.setFillColor(37, 99, 235);
    } else if (dept.avgAttainmentPct >= 85) {
      doc.setFillColor(5, 150, 105);
    } else {
      doc.setFillColor(217, 119, 6);
    }
    doc.rect(barAreaX, y - 1.2, fillW, 4, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `${dept.avgAttainmentPct}% (${dept.onTrackRatePct}% sesuai)`,
      pageW - margin - 4,
      y + 2,
      { align: 'right' },
    );
  });

  cursorY += barChartH + 9;

  // ---------------------------------------------------------------------------
  // 5. Departmental Performance Breakdown Table
  // ---------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Rincian Kartu Skor per Departemen', margin, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [
      [
        'Departemen',
        'Pemilik',
        'KPI',
        'Rata-rata Capaian',
        'Sesuai Target',
        'Kompetensi',
        'Komposit',
        'Pembinaan',
      ],
    ],
    body: departments.map((d) => [
      d.department,
      String(d.employeeCount),
      String(d.kpiCount),
      `${d.avgAttainmentPct}%`,
      `${d.onTrackRatePct}%`,
      `${d.avgCompetency.toFixed(2)} / 5,0`,
      String(d.avgCompositeIndex),
      String(d.coachingNeededCount),
    ]),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
    },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
  });

  const afterDeptTableY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    cursorY + 35;
  cursorY = afterDeptTableY + 10;

  // ---------------------------------------------------------------------------
  // 6. Key Downward-Trending KPI Alerts (3-Month Window)
  // ---------------------------------------------------------------------------
  if (cursorY > pageH - 55) {
    doc.addPage();
    cursorY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Peringatan KPI Tren Menurun 3 Bulan (Sep - Nov 2026)', margin, cursorY);
  cursorY += 3;

  if (downwardAlerts.length === 0) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin, cursorY, contentW, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 95, 70);
    doc.text(
      'Tidak ada KPI pada cakupan ini yang mengalami penurunan konsisten 3 bulan (>= 8 poin persentase).',
      margin + 4,
      cursorY + 7.5,
    );
  } else {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [
        [
          'Metrik KPI',
          'Pemilik',
          'Departemen',
          'Perkembangan 3B (Sep -> Okt -> Nov)',
          'Selisih 3B',
          'Tingkat',
        ],
      ],
      body: downwardAlerts.map((item) => [
        item.kpi.title,
        item.kpi.employeeName,
        item.kpi.department,
        item.series.map((s) => `${s.month} ${s.value}%`).join(' -> '),
        `${item.threeMonthChangePts} poin`,
        item.severity === 'Critical' ? 'Kritis' : 'Peringatan',
      ]),
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.3,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [254, 242, 242],
        textColor: [153, 27, 27],
        fontStyle: 'bold',
      },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
        5: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw);
          data.cell.styles.textColor =
            val === 'Kritis' ? [185, 28, 28] : [180, 83, 9];
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Page Footers
  // ---------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Luzie Performance Analytics  ·  Ringkasan KPI Departemen & Tren Menurun`,
      margin,
      pageH - 8,
    );
    doc.text(`Halaman ${i} dari ${totalPages}`, pageW - margin, pageH - 8, {
      align: 'right',
    });
  }

  const slugDept = scopeDept.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `ringkasan-kinerja-departemen-${slugDept}-${dateStamp}.pdf`;
  doc.save(filename);
  return filename;
}
