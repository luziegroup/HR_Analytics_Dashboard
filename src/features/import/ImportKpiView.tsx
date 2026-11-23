import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, RotateCcw, Upload } from 'lucide-react';
import { GoogleDriveConnector } from '@/components/drive/GoogleDriveConnector';
import { SectionCard } from '@/components/ui/SectionCard';
import type { ComputedKpi, KpiMetric } from '@/types/kpi';
import { exportKpisToCsv, parseKpisFromCsv } from '@/utils/kpiCsv';

interface ImportKpiViewProps {
  currentKpis: ComputedKpi[];
  isCustomDataset: boolean;
  onDatasetLoaded: (kpis: KpiMetric[], fileName: string) => void;
  onResetDataset: () => void;
}

export const ImportKpiView: React.FC<ImportKpiViewProps> = ({
  currentKpis,
  isCustomDataset,
  onDatasetLoaded,
  onResetDataset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setWarnings([]);
    setSuccessMsg(null);

    try {
      const text = await file.text();
      const { kpis, warnings: parseWarnings } = parseKpisFromCsv(text);
      setWarnings(parseWarnings);
      setSuccessMsg(`Berhasil memuat ${kpis.length} target KPI dari "${file.name}".`);
      onDatasetLoaded(kpis, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca berkas CSV KPI.');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Google Drive Folder Source */}
      <GoogleDriveConnector onDatasetLoaded={onDatasetLoaded} />

      {/* Local CSV Import */}
      <SectionCard
        title="Unggah CSV Lokal & Template"
        subtitle="Unggah target KPI dan realisasi capaian (.csv) dari perangkat Anda, atau kembalikan ke data dasar."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportKpisToCsv(currentKpis, 'template-kartu-skor-kpi.csv')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Template KPI
            </button>
            {isCustomDataset && (
              <button
                type="button"
                onClick={() => {
                  onResetDataset();
                  setSuccessMsg('Data KPI dasar Q4 2026 berhasil dipulihkan.');
                  setError(null);
                  setWarnings([]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Data Demo
              </button>
            )}
          </div>
        }
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragging
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
          }`}
        >
          <Upload className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="mt-2.5 text-sm font-medium text-slate-900">
            Letakkan berkas CSV KPI Anda di sini, atau pilih dari perangkat
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Kolom wajib: KPI Title (Judul KPI), Target, Actual (Aktual) · Opsional: Employee Name, Department, Category, Unit, Weight (%)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Pilih Berkas CSV Lokal
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">{successMsg}</div>
              {warnings.map((w) => (
                <div key={w} className="mt-1 text-emerald-800">
                  Catatan: {w}
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
