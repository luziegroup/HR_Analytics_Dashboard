import React from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import type { KpiStatus, ReviewStatus } from '@/types/kpi';

export const KpiStatusLabel: React.FC<{ status: KpiStatus }> = ({ status }) => {
  if (status === 'Exceeded') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 whitespace-nowrap">
        <Award className="w-3.5 h-3.5" />
        Melampaui Target
      </span>
    );
  }
  if (status === 'On Track') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Sesuai Target
      </span>
    );
  }
  if (status === 'At Risk') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5" />
        Perlu Perhatian
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5" />
      Di Bawah Target
    </span>
  );
};

export const ReviewStatusLabel: React.FC<{ status: ReviewStatus }> = ({ status }) => {
  if (status === 'Calibrated') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Terkalibrasi
      </span>
    );
  }
  if (status === 'Manager Review') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5" />
        Tinjauan Manajer
      </span>
    );
  }
  if (status === 'Self Review') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5" />
        Penilaian Mandiri
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5" />
      Menunggu
    </span>
  );
};
