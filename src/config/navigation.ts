import type { ComponentType } from 'react';
import {
  CalendarClock,
  CheckSquare,
  Grid3x3,
  LineChart,
  Target,
  Upload,
} from 'lucide-react';
import type { KpiView } from '@/types/kpi';

export interface NavItemConfig {
  id: KpiView;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  showGlobalFilters: boolean;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'overview',
    label: 'Ringkasan Kinerja',
    description: 'Pencapaian KPI eksekutif, tren bulanan, korelasi, dan antrean pembinaan.',
    icon: LineChart,
    showGlobalFilters: true,
  },
  {
    id: 'scorecard',
    label: 'Kartu Skor KPI',
    description: 'Target KPI individu & departemen, realisasi aktual, dan pembaruan progres.',
    icon: Target,
    showGlobalFilters: true,
  },
  {
    id: 'matrix',
    label: 'Matriks 9-Box & Distribusi',
    description: 'Matriks 9-box pencapaian KPI vs. kompetensi dan distribusi peringkat.',
    icon: Grid3x3,
    showGlobalFilters: true,
  },
  {
    id: 'calibration',
    label: 'Kalibrasi Penilaian',
    description: 'Selisih penilaian mandiri vs. kalibrasi manajer dan penyelesaian siklus.',
    icon: CheckSquare,
    showGlobalFilters: true,
  },
  {
    id: 'reports',
    label: 'Laporan Bulanan',
    description: 'Ringkasan KPI departemen otomatis setiap tanggal 1 dan arsip notifikasi.',
    icon: CalendarClock,
    showGlobalFilters: false,
  },
  {
    id: 'import',
    label: 'Sumber Data & Drive',
    description: 'Hubungkan folder Google Drive, sinkronkan sheet KPI, atau unggah CSV lokal.',
    icon: Upload,
    showGlobalFilters: false,
  },
];
