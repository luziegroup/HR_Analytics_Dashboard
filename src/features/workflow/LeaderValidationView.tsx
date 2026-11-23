import { useState } from 'react';
import { SectionCard } from '@/components/ui/SectionCard';
import { KPI_DEFINITIONS } from '@/config/kpiDefinitions';
import { MONTHS, SCORE_CAP_PCT, TEAM_MEMBERS } from '@/config/team';
import type { KpiSubmission } from '@/types/submission';
import {
  categoryForScore,
  downloadCsv,
  scoreEmployeeMonth,
} from '@/utils/kpiSubmissionScoring';
import { StatusBadge } from './StatusBadge';

interface Props {
  monthKey: string;
  submissions: KpiSubmission[];
  onDecide: (
    sub: KpiSubmission,
    decision: 'Validated' | 'Rejected',
    note: string,
    score: number,
  ) => void;
}

function ReviewCard({ sub, onDecide }: { sub: KpiSubmission; onDecide: Props['onDecide'] }) {
  const def = KPI_DEFINITIONS.find((d) => d.id === sub.kpiId);
  const member = TEAM_MEMBERS.find((m) => m.id === sub.employeeId);
  const [score, setScore] = useState(String(sub.claimedScore));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: 'Validated' | 'Rejected') => {
    setError(null);
    const n = Number(score.replace(',', '.'));
    if (decision === 'Validated') {
      if (!Number.isFinite(n) || n < 0 || n > SCORE_CAP_PCT) {
        return setError(`Skor tervalidasi harus antara 0 dan ${SCORE_CAP_PCT}.`);
      }
      if (n !== sub.claimedScore && !note.trim()) {
        return setError('Skor dikoreksi, isi alasan koreksi pada catatan.');
      }
    }
    if (decision === 'Rejected' && !note.trim()) {
      return setError('Isi alasan saat mengembalikan.');
    }
    onDecide(sub, decision, note.trim(), n);
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

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Skor akhir dari karyawan</p>
          <p className="text-lg font-semibold tabular-nums">{sub.claimedScore}%</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-slate-500">File KPI pendukung</p>
          <a className="text-blue-700 underline break-all" href={sub.evidenceUrl} target="_blank" rel="noopener noreferrer">
            {sub.evidenceUrl}
          </a>
        </div>
      </div>

      {def && (
        <p className="text-xs text-slate-500">
          100% bila: {def.perfect}. Cara hitung: {def.method}.
        </p>
      )}
      {sub.note && <p className="text-xs text-slate-600">Catatan karyawan: {sub.note}</p>}

      {sub.status === 'Submitted' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs text-slate-600">
              Skor tervalidasi (%)
              <input className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} />
            </label>
            <label className="text-xs text-slate-600 sm:col-span-3">
              Catatan leader (wajib bila dikoreksi atau dikembalikan)
              <input className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => decide('Validated')}
              className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer">
              Setujui
            </button>
            <button type="button" onClick={() => decide('Rejected')}
              className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-50 cursor-pointer">
              Kembalikan
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500">
          {sub.status === 'Validated'
            ? `Disetujui ${sub.validatedBy}: skor ${sub.validatedScore}%${
                sub.validatedScore !== sub.claimedScore ? ` (dikoreksi dari ${sub.claimedScore}%)` : ''
              }`
            : `Dikembalikan oleh ${sub.validatedBy}`}
          {sub.leaderNote ? `. ${sub.leaderNote}` : ''}
        </p>
      )}
    </div>
  );
}

export function LeaderValidationView({ monthKey, submissions, onDecide }: Props) {
  const [filter, setFilter] = useState<'Submitted' | 'all'>('Submitted');
  const monthLabel = MONTHS.find((m) => m.key === monthKey)?.label ?? monthKey;
  const shown = submissions
    .filter((s) => (filter === 'all' ? s.status !== 'Draft' : s.status === 'Submitted'))
    .sort((a, b) =>
      (a.employeeId + a.kpiId).localeCompare(b.employeeId + b.kpiId, undefined, { numeric: true }),
    );
  const pending = submissions.filter((s) => s.status === 'Submitted').length;

  const exportSummary = () =>
    downloadCsv(`rekap-nilai-kpi-${monthKey}.csv`, [
      ['Nama', 'Bulan', 'Nilai KPI (%)', 'Kategori', 'KPI tervalidasi', 'Total KPI'],
      ...TEAM_MEMBERS.map((m) => {
        const sc = scoreEmployeeMonth(m.id, submissions.filter((s) => s.employeeId === m.id));
        return [
          m.name,
          monthLabel,
          (sc.validatedScore * 100).toFixed(1),
          sc.validatedCount === 0 ? 'Belum ada' : categoryForScore(sc.validatedScore),
          sc.validatedCount,
          sc.kpiCount,
        ];
      }),
    ]);

  const exportDetail = () =>
    downloadCsv(`detail-kpi-${monthKey}.csv`, [
      ['Nama', 'Bulan', 'KPI', 'Bobot (%)', 'Status', 'Skor diisi (%)', 'Skor tervalidasi (%)', 'Link bukti', 'Divalidasi oleh', 'Tanggal validasi', 'Catatan leader'],
      ...KPI_DEFINITIONS.map((d) => {
        const s = submissions.find((x) => x.kpiId === d.id);
        const name = TEAM_MEMBERS.find((m) => m.id === d.employeeId)?.name ?? d.employeeId;
        return [
          name, monthLabel, `${d.no}. ${d.title}`, Math.round(d.weight * 100), s?.status ?? 'Belum diisi',
          s?.claimedScore ?? '', s?.validatedScore ?? '', s?.evidenceUrl ?? '',
          s?.validatedBy ?? '', s?.validatedAt?.slice(0, 10) ?? '', s?.leaderNote ?? '',
        ];
      }),
    ]);

  const btn = 'px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer';

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Rekap nilai KPI ${monthLabel} (tervalidasi)`}
        subtitle="Poin akhir hanya dari KPI yang sudah disetujui leader."
        action={
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={exportSummary}>Unduh rekap (CSV)</button>
            <button type="button" className={btn} onClick={exportDetail}>Unduh detail (CSV)</button>
          </div>
        }
      >
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
            <ReviewCard key={s.id + s.updatedAt} sub={s} onDecide={onDecide} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
