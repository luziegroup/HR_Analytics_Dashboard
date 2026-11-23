import { useState } from 'react';
import { SectionCard } from '@/components/ui/SectionCard';
import { KPI_DEFINITIONS } from '@/config/kpiDefinitions';
import { TEAM_MEMBERS } from '@/config/team';
import type { KpiSubmission } from '@/types/submission';
import {
  categoryForScore,
  realisasiRatio,
  scoreEmployeeMonth,
} from '@/utils/kpiSubmissionScoring';
import { StatusBadge } from './StatusBadge';

interface Props {
  leaderEmail: string;
  submissions: KpiSubmission[];
  onDecide: (sub: KpiSubmission, decision: 'Validated' | 'Rejected', note: string) => Promise<void>;
}

function ReviewCard({
  sub,
  leaderEmail,
  onDecide,
}: {
  sub: KpiSubmission;
  leaderEmail: string;
  onDecide: Props['onDecide'];
}) {
  const def = KPI_DEFINITIONS.find((d) => d.id === sub.kpiId);
  const member = TEAM_MEMBERS.find((m) => m.id === sub.employeeId);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ratio = realisasiRatio(sub.target, sub.actual);
  const own = sub.ownerEmail.toLowerCase() === leaderEmail.toLowerCase();

  const decide = async (decision: 'Validated' | 'Rejected') => {
    setError(null);
    if (decision === 'Rejected' && !note.trim()) return setError('Isi alasan saat mengembalikan.');
    setBusy(true);
    try {
      await onDecide(sub, decision, note.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan keputusan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {member?.name ?? sub.employeeId}: KPI {def?.no}. {def?.title ?? sub.kpiId}
          </p>
          <p className="text-xs text-slate-500">Bobot {def ? Math.round(def.weight * 100) : '-'}%</p>
        </div>
        <StatusBadge status={sub.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4 text-sm">
        <div><p className="text-xs text-slate-500">Target</p><p className="tabular-nums">{sub.target} {def?.unit}</p></div>
        <div><p className="text-xs text-slate-500">Tercapai</p><p className="tabular-nums">{sub.actual} {def?.unit}</p></div>
        <div><p className="text-xs text-slate-500">Realisasi</p>
          <p className="font-semibold tabular-nums">{ratio === null ? '-' : `${(ratio * 100).toFixed(1)}%`}</p></div>
        <div><p className="text-xs text-slate-500">Bukti</p>
          <a className="text-blue-700 underline break-all" href={sub.evidenceUrl} target="_blank" rel="noopener noreferrer">
            Buka link
          </a></div>
      </div>

      {def && <p className="text-xs text-slate-500">100% bila: {def.perfect}</p>}
      {sub.note && <p className="text-xs text-slate-600">Catatan karyawan: {sub.note}</p>}

      {sub.status === 'Submitted' && !own && (
        <>
          <input
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
            placeholder="Catatan leader (wajib bila dikembalikan)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => decide('Validated')}
              className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50">
              Setujui
            </button>
            <button type="button" disabled={busy} onClick={() => decide('Rejected')}
              className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50">
              Kembalikan
            </button>
          </div>
        </>
      )}
      {sub.status === 'Submitted' && own && (
        <p className="text-xs text-amber-700">KPI milik Anda sendiri harus divalidasi leader lain.</p>
      )}
      {sub.status !== 'Submitted' && sub.validatedBy && (
        <p className="text-xs text-slate-500">
          {sub.status === 'Validated' ? 'Disetujui' : 'Dikembalikan'} oleh {sub.validatedBy}
          {sub.leaderNote ? `: ${sub.leaderNote}` : ''}
        </p>
      )}
      {error && sub.status !== 'Submitted' && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function LeaderValidationView({ leaderEmail, submissions, onDecide }: Props) {
  const [filter, setFilter] = useState<'Submitted' | 'all'>('Submitted');
  const shown = submissions
    .filter((s) => (filter === 'all' ? s.status !== 'Draft' : s.status === 'Submitted'))
    .sort((a, b) => (a.employeeId + a.kpiId).localeCompare(b.employeeId + b.kpiId, undefined, { numeric: true }));
  const pending = submissions.filter((s) => s.status === 'Submitted').length;

  return (
    <div className="space-y-6">
      <SectionCard title="Rekap nilai KPI (tervalidasi)" subtitle="Nilai resmi hanya dari KPI yang sudah disetujui.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Nama</th><th className="pr-3">Nilai KPI</th><th className="pr-3">Kategori</th>
                <th className="pr-3">Tervalidasi</th><th className="pr-3">Menunggu</th><th className="pr-3">Dikembalikan</th>
                <th>Jika semua disetujui</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_MEMBERS.map((m) => {
                const sc = scoreEmployeeMonth(m.id, submissions.filter((s) => s.employeeId === m.id));
                return (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium">{m.name}</td>
                    <td className="pr-3 tabular-nums">{(sc.validatedScore * 100).toFixed(1)}%</td>
                    <td className="pr-3">{sc.validatedCount === 0 ? 'Belum ada' : categoryForScore(sc.validatedScore)}</td>
                    <td className="pr-3 tabular-nums">{sc.validatedCount}/{sc.kpiCount}</td>
                    <td className="pr-3 tabular-nums">{sc.submittedCount}</td>
                    <td className="pr-3 tabular-nums">{sc.rejectedCount}</td>
                    <td className="tabular-nums">{(sc.projectedScore * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title={`Antrean validasi (${pending} menunggu)`}
        action={
          <select className="border border-slate-300 rounded-lg px-2 py-1 text-sm" value={filter}
            onChange={(e) => setFilter(e.target.value as 'Submitted' | 'all')}>
            <option value="Submitted">Menunggu validasi</option>
            <option value="all">Semua yang sudah dikirim</option>
          </select>
        }
      >
        <div className="space-y-4">
          {shown.length === 0 && <p className="text-sm text-slate-500">Tidak ada kiriman untuk ditampilkan.</p>}
          {shown.map((s) => (
            <ReviewCard key={s.id + s.updatedAt} sub={s} leaderEmail={leaderEmail} onDecide={onDecide} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
