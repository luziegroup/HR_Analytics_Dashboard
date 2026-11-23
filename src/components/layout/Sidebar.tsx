import React from 'react';
import { X } from 'lucide-react';
import { NAV_ITEMS } from '@/config/navigation';
import type { KpiView } from '@/types/kpi';

interface SidebarProps {
  activeView: KpiView;
  onSelectView: (view: KpiView) => void;
  datasetLabel: string;
  totalKpis: number;
  totalEmployees: number;
  unreadReportCount?: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  datasetLabel,
  totalKpis,
  totalEmployees,
  unreadReportCount = 0,
  mobileOpen,
  onCloseMobile,
}) => {
  const navList = (
    <nav className="flex-1 p-4 space-y-1" aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}
            />
            <span className="truncate">{item.label}</span>
            {item.id === 'reports' && unreadReportCount > 0 && (
              <span className="ml-auto font-mono text-xs font-semibold text-blue-700 tabular-nums shrink-0">
                {unreadReportCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const footerMeta = (
    <div className="p-5 border-t border-slate-200 text-xs text-slate-500 space-y-1">
      <div className="font-medium text-slate-700 truncate">{datasetLabel}</div>
      <div className="font-mono tabular-nums">
        {totalKpis} KPI · {totalEmployees} pemilik
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Luzie Performance
          </span>
        </div>
        {navList}
        {footerMeta}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-slate-900/30"
          onClick={onCloseMobile}
        >
          <aside
            className="w-64 h-full bg-white border-r border-slate-200 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col flex-1">
              <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
                <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                  Luzie Performance
                </span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Tutup menu navigasi"
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {navList}
            </div>
            {footerMeta}
          </aside>
        </div>
      )}
    </>
  );
};
