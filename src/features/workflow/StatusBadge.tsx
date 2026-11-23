import type { SubmissionStatus } from '@/types/submission';

const STYLE: Record<SubmissionStatus | 'Kosong', string> = {
  Kosong: 'bg-slate-100 text-slate-600',
  Draft: 'bg-slate-100 text-slate-700',
  Submitted: 'bg-amber-50 text-amber-700',
  Validated: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
};

const LABEL: Record<SubmissionStatus | 'Kosong', string> = {
  Kosong: 'Belum diisi',
  Draft: 'Draf',
  Submitted: 'Menunggu validasi',
  Validated: 'Tervalidasi',
  Rejected: 'Dikembalikan',
};

export function StatusBadge({ status }: { status?: SubmissionStatus }) {
  const key = status ?? 'Kosong';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STYLE[key]}`}>
      {LABEL[key]}
    </span>
  );
}
