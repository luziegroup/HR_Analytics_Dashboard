import { useEffect, useState } from 'react';
import { SectionCard } from '@/components/ui/SectionCard';
import { KPI_DEFINITIONS } from '@/config/kpiDefinitions';
import { MONTHS, SCORE_CAP_PCT } from '@/config/team';
import { submissionId } from '@/services/submissionStore';
import type { KpiDefinition, KpiSubmission, TeamMember } from '@/types/submission';
import {
  categoryForScore,
  isValidEvidenceUrl,
  scoreEmployeeMonth,
} from '@/utils/kpiSubmissionScoring';
import { StatusBadge } from './StatusBadge';

interface Props {
  member: TeamMember;
  monthKey: string;
  submissions: KpiSubmission[];
  onSave: (sub: KpiSubmission) => void;
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-500';

function KpiRow({
  def,
  sub,
  member,
  monthKey,
  onSave,
}: {
  def: KpiDefinition;
  sub?: KpiSubmission;
  member: TeamMember;
  monthKey: string;
  onSave: (sub: KpiSubmission) => void;
}) {
  const [score, setScore] = useState(sub ? String(sub.claimedScore) : '');
  const [url, setUrl] = useState(sub?.evidenceUrl ?? '');
  const [note, setNote] = useState(sub?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScore(sub ? String(sub.claimedScore) : '');
    setUrl(sub?.evidenceUrl ?? '');
    setNote(sub?.note ?? '');
  }, [sub?.updatedAt, sub?.status]);

  const locked = sub?.status === 'Submitted' || sub?.status === 'Validated';

  const persist = (status: 'Draft' | 'Submitted') => {
    setError(null);
    const n = Number(score.replace(',', '.'));
    if (status === 'Submitted') {
      if (score.trim() === '' || !Number.isFinite(n) || n < 0 || n > SCORE_CAP_PCT) {
        return setError(`Isi skor akhir antara 0 dan ${SCORE_CAP_PCT}.`);
      }
      if (!isValidEvidenceUrl(url)) {
        return setError('Link file KPI pendukung wajib diisi (diawali https://).');
      }
    }
    const now = new Date().toISOString();
    onSave({
      id: submissionId(monthKey, def.id),
      kpiId: def.id,
      employeeId: member.id,
      monthKey,
      claimedScore: Number.isFinite(n) ? n : 0,
      evidenceUrl: url.trim(),
      note: note.trim(),
      status,
      updatedAt: now,
      submittedAt: status === 'Submitted' ? now : sub?.submittedAt,
      leaderNote: sub?.status === 'Rejected' ? sub.leaderNote : undefined,
    });
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            KPI {def.no}. {def.title}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Bobot {Math.round(def.weight * 100)}%</p>
        </div>
        <StatusBadge status={sub?.status} />
      </div>

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer text-blue-700">Apa yang harus ada di file KPI pendukung?</summary>
        <div className="mt-2 space-y-1 bg-slate-50 rounded-lg p-3">
          <p><span className="font-medium">100% bila:</span> {def.perfect}</p>
          <p><span className="font-medium">Cara menghitung skor:</span> {def.method}</p>
          <p><span className="font-medium">File bukti:</span> {def.evidence}</p>
          <p><span className="font-medium">Contoh:</span> {def.example}</p>
        </div>
      </details>

      {sub?.status === 'Rejected' && sub.leaderNote && (
        <p className="text-xs bg-red-50 text-red-700 rounded-lg p-2.5">
          Dikembalikan leader: {sub.leaderNote}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs text-slate-600">
          Skor akhir (%)
          <input className={inputCls} inputMode="decimal" placeholder="contoh: 90" value={score}
            disabled={locked} onChange={(e) => setScore(e.target.value)} />
        </label>
        <label className="text-xs text-slate-600 sm:col-span-3">
          Link file KPI pendukung
          <input className={inputCls} placeholder="https://drive.google.com/..." value={url}
            disabled={locked} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <label className="text-xs text-slate-600 sm:col-span-4">
          Catatan (opsional)
          <input className={inputCls} value={note} disabled={locked}
            onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!locked && (
        <div className="flex gap-2">
          <button type="button" onClick={() => persist('Draft')}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer">
            Simpan draf
          </button>
          <button type="button" onClick={() => persist('Submitted')}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
            Kirim ke leader
          </button>
        </div>
      )}
      {sub?.status === 'Validated' && (
        <p className="text-xs text-emerald-700">
          Divalidasi {sub.validatedBy}: skor {sub.validatedScore}%
          {sub.validatedScore !== sub.claimedScore ? ` (dikoreksi dari ${sub.claimedScore}%)` : ''}
          {sub.leaderNote ? `. ${sub.leaderNote}` : ''}
        </p>
      )}
    </div>
  );
}

export function MyKpiInputView({ member, monthKey, submissions, onSave }: Props) {
  const defs = KPI_DEFINITIONS.filter((d) => d.employeeId === member.id);
  const byKpi = new Map(submissions.map((s) => [s.kpiId, s]));
  const score = scoreEmployeeMonth(member.id, submissions);
  const monthLabel = MONTHS.find((m) => m.key === monthKey)?.label ?? monthKey;

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Nilai KPI ${member.name} (${monthLabel})`}
        subtitle="Nilai resmi hanya dihitung dari KPI yang sudah divalidasi leader."
      >
        <div className="grid gap-4 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Nilai tervalidasi</p>
            <p className="text-2xl font-semibold tabular-nums">{(score.validatedScore * 100).toFixed(1)}%</p>
            <p className="text-xs text-slate-500">
              {score.validatedCount === 0 ? 'Belum ada' : categoryForScore(score.validatedScore)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Jika semua kiriman disetujui</p>
            <p className="text-2xl font-semibold tabular-nums">{(score.projectedScore * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tervalidasi</p>
            <p className="text-2xl font-semibold tabular-nums">{score.validatedCount}/{score.kpiCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Menunggu / dikembalikan</p>
            <p className="text-2xl font-semibold tabular-nums">{score.submittedCount} / {score.rejectedCount}</p>
          </div>
        </div>
      </SectionCard>

      {defs.map((def) => (
        <KpiRow key={`${monthKey}-${def.id}`} def={def} sub={byKpi.get(def.id)} member={member}
          monthKey={monthKey} onSave={onSave} />
      ))}
    </div>
  );
}
