import { useState } from 'react';
import { SectionCard } from '@/components/ui/SectionCard';
import { MONTHS, SCORE_CAP_PCT, TEAM_MEMBERS } from '@/config/team';
import type { KpiSubmission, TeamMember } from '@/types/submission';
import {
  categoryForScorePct,
  downloadCsv,
  officialScorePct,
  parseScore,
} from '@/utils/kpiSubmissionScoring';
import { buildCellLink, fetchSheetCell, parseScoreText, periodMatches } from '@/utils/sheetReader';
import { KpiReferenceList } from './KpiReferenceList';
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

function ReviewCard({
  sub,
  member,
  onDecide,
}: {
  sub: KpiSubmission;
  member: TeamMember;
  onDecide: Props['onDecide'];
}) {
  const [score, setScore] = useState(String(sub.claimedScore));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recheck, setRecheck] = useState<{ text: string; ok: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const monthLabel = MONTHS.find((m) => m.key === sub.monthKey)?.label ?? sub.monthKey;

  const recheckFromSheet = async () => {
    setChecking(true);
    setRecheck(null);
    try {
      const raw = await fetchSheetCell(sub.evidenceUrl, sub.sheetTab, sub.scoreCell);
      const parsed = parseScoreText(raw);
      let periodText = '';
      if (sub.periodCell) {
        try {
          const pr = await fetchSheetCell(sub.evidenceUrl, sub.sheetTab, sub.periodCell);
          periodText = periodMatches(pr, sub.monthKey)
            ? ` Periode di file "${pr}" cocok dengan ${monthLabel}.`
            : ` Periode di file "${pr}" TIDAK cocok dengan ${monthLabel}.`;
        } catch {
          periodText = ' Sel periode tidak terbaca.';
        }
      }
      if (!parsed) {
        setRecheck({ text: `Isi sel sekarang: "${raw}" (bukan angka).${periodText}`, ok: false });
      } else if (Math.abs(parsed.pct - sub.claimedScore) < 0.05) {
        setRecheck({ text: `Cocok. Nilai di file sekarang ${parsed.pct}%, sama dengan yang dikirim.${periodText}`, ok: true });
      } else {
        setRecheck({ text: `BERBEDA. Nilai di file sekarang ${parsed.pct}%, yang dikirim ${sub.claimedScore}%.${periodText}`, ok: false });
      }
    } catch (e) {
      setRecheck({ text: e instanceof Error ? e.message : 'Gagal membaca file.', ok: false });
    } finally {
      setChecking(false);
    }
  };

  const decide = (decision: 'Validated' | 'Rejected') => {
    setError(null);
    const n = parseScore(score);
    if (decision === 'Validated') {
      if (n === null) return setError(`Nilai tervalidasi harus antara 0 dan ${SCORE_CAP_PCT}.`);
      if (n !== sub.claimedScore && !note.trim()) {
        return setError('Nilai dikoreksi, isi alasan koreksi pada catatan.');
      }
      return onDecide(sub, decision, note.trim(), n);
    }
    if (!note.trim()) return setError('Isi alasan saat mengembalikan.');
    onDecide(sub, decision, note.trim(), sub.claimedScore);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
          <p className="text-xs text-slate-500">{member.role}</p>
        </div>
        <StatusBadge status={sub.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Nilai final dari karyawan</p>
          <p className="text-2xl font-semibold tabular-nums">{sub.claimedScore}%</p>
        </div>
        <div className="sm:col-span-2 space-y-1">
          <p className="text-xs text-slate-500">File KPI rinci (untuk dicek)</p>
          <a className="text-blue-700 underline break-all" href={buildCellLink(sub.evidenceUrl, sub.scoreCell)} target="_blank" rel="noopener noreferrer">
            Buka file
          </a>
          <p className="text-xs text-slate-600">
            Tab: <span className="font-medium">{sub.sheetTab}</span>, sel nilai:{' '}
            <span className="font-medium">{sub.scoreCell}</span>
            {sub.periodCell ? `, sel periode: ${sub.periodCell}` : ''}. Periode KPI: {monthLabel}.
          </p>
          <p className={`text-xs ${sub.scoreSource === 'sheet' ? 'text-emerald-700' : 'text-amber-700'}`}>
            {sub.scoreSource === 'sheet'
              ? `Nilai dibaca otomatis dari sel (isi sel: "${sub.fetchedRaw}")${
                  sub.fetchedPeriodRaw ? `, periode di file: "${sub.fetchedPeriodRaw}"` : ''
                }.`
              : 'Nilai diketik manual oleh karyawan. Cek langsung di file sebelum menyetujui.'}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <button type="button" disabled={checking} onClick={recheckFromSheet}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
          {checking ? 'Membaca...' : 'Cek ulang nilai dari file'}
        </button>
        {recheck && (
          <p className={`text-xs ${recheck.ok ? 'text-emerald-700' : 'text-red-700'}`}>{recheck.text}</p>
        )}
      </div>

      {sub.note && <p className="text-xs text-slate-600">Catatan karyawan: {sub.note}</p>}
      <KpiReferenceList employeeId={member.id} title="Daftar KPI dan bobot sebagai panduan pengecekan" />

      {sub.status === 'Submitted' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs text-slate-600">
              Nilai tervalidasi (%)
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
            ? `Disetujui ${sub.validatedBy}: nilai ${sub.validatedScore}%${
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
  const byEmployee = new Map(submissions.map((s) => [s.employeeId, s]));
  const pending = submissions.filter((s) => s.status === 'Submitted').length;
  const shown = TEAM_MEMBERS.map((m) => ({ member: m, sub: byEmployee.get(m.id) })).filter(
    (x): x is { member: TeamMember; sub: KpiSubmission } =>
      !!x.sub && (filter === 'all' ? x.sub.status !== 'Draft' : x.sub.status === 'Submitted'),
  );

  const exportCsv = () =>
    downloadCsv(`rekap-nilai-kpi-${monthKey}.csv`, [
      ['Nama', 'Periode KPI', 'Status', 'Nilai diisi (%)', 'Nilai tervalidasi (%)', 'Kategori', 'Link file KPI', 'Tab', 'Sel nilai', 'Sumber nilai', 'Divalidasi oleh', 'Tanggal validasi', 'Catatan leader'],
      ...TEAM_MEMBERS.map((m) => {
        const s = byEmployee.get(m.id);
        const off = officialScorePct(s);
        return [
          m.name, monthLabel, s?.status ?? 'Belum diisi', s?.claimedScore ?? '',
          off ?? '', off === null ? '' : categoryForScorePct(off), s?.evidenceUrl ?? '',
          s?.sheetTab ?? '', s?.scoreCell ?? '', s ? (s.scoreSource === 'sheet' ? 'Dibaca dari file' : 'Manual') : '',
          s?.validatedBy ?? '', s?.validatedAt?.slice(0, 10) ?? '', s?.leaderNote ?? '',
        ];
      }),
    ]);

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Rekap nilai final ${monthLabel}`}
        subtitle="Nilai resmi hanya dari kiriman yang sudah divalidasi leader."
        action={
          <button type="button" onClick={exportCsv}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
            Unduh rekap (CSV)
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Nama</th><th className="pr-3">Status</th><th className="pr-3">Nilai diisi</th>
                <th className="pr-3">Nilai resmi</th><th>Kategori</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_MEMBERS.map((m) => {
                const s = byEmployee.get(m.id);
                const off = officialScorePct(s);
                return (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium">{m.name}</td>
                    <td className="pr-3"><StatusBadge status={s?.status} /></td>
                    <td className="pr-3 tabular-nums">{s && s.status !== 'Draft' ? `${s.claimedScore}%` : '-'}</td>
                    <td className="pr-3 tabular-nums font-semibold">{off === null ? '-' : `${off.toFixed(1)}%`}</td>
                    <td>{off === null ? '-' : categoryForScorePct(off)}</td>
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
          {shown.map(({ member, sub }) => (
            <ReviewCard key={sub.id + sub.updatedAt} sub={sub} member={member} onDecide={onDecide} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
