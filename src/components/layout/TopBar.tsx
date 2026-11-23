import React from 'react';
import { Download, FileText, Menu } from 'lucide-react';

interface TopBarProps {
  title: string;
  onOpenMobileMenu: () => void;
  onExportCsv: () => void;
  onDownloadPdf: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  onOpenMobileMenu,
  onExportCsv,
  onDownloadPdf,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
          <span className="hidden sm:inline">KPI & Kinerja</span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onDownloadPdf}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-slate-600" />
          Unduh Ringkasan PDF
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Ekspor CSV KPI
        </button>
      </div>
    </header>
  );
};
