import { useEffect, useState } from 'react';
import { SectionCard } from '@/components/ui/SectionCard';
import { KPI_DEFINITIONS } from '@/config/kpiDefinitions';
import { MONTHS } from '@/config/team';
import { submissionId } from '@/services/submissionService';
import type { KpiDefinition, KpiSubmission, TeamMember } from '@/types/submission';
import {
  categoryForScore,
  isValidEvidenceUrl,
  realisasiRatio,
  scoreEmployeeMonth,
} from '@/utils/kpiSubmissionScoring';
import { StatusBadge } from './StatusBadge';

interface Props {
  member: TeamMember;
  email: string;
  monthKey: string;
  submissions: KpiSubmission[];
  onSave: (sub: KpiSubmission) => Promise<void>;
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-500';

function parseNumber(v: string): number {
  return Number(v.replace(',', '.'));
}

function KpiRow({
  def,
  sub,
  member,
  email,
  monthKey,
  onSave,
}: {
  def: KpiDefinition;
  sub?: KpiSubmission;
  member: TeamMember;
  email: string;
  monthKey: string;
  onSave: (sub: KpiSubmission) => Promise<void>;
}) {
  const [target, setTarget] = useState(sub ? String(sub.target) : '');
  const [actual, setActual] = useState(sub ? String(sub.actual) : '');
  const [url, setUrl] = useState(sub?.evidenceUrl ?? '');
  const [note, setNote] = useState(sub?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTarget(sub ? String(sub.target) : '');
    setActual(sub ? String(sub.actual) : '');
    setUrl(sub?.evidenceUrl ?? '');
    setNote(sub?.note ?? '');
  }, [sub?.updatedAt, sub?.status]);

  const locked = sub?.status === 'Submitted' || sub?.status === 'Validated';
  const t = parseNumber(target);
  const a = parseNumber(actual);
  const ratio = target !== '' && actual !== '' ? realisasiRatio(t, a) : null;

  const persist = async (status: 'Draft' | 'Submitted') => {
    setError(null);
    if (status === 'Submitted') {
      if (!(t > 0)) return setError('Isi target lebih dari 0.');
      if (!(a >= 0) || actual === '') return setError('Isi jumlah tercapai (0 atau lebih).');
      if (!isValidEvidenceUrl(url)) return setError('Link bukti wajib diisi (diawali https://).');
    }
    const now = new Date().toISOString();
    const next: KpiSubmission = {
      id: submissionId(monthKey, def.id),
      kpiId: def.id,
      employeeId: member.id,
      ownerEmail: email,
      monthKey,
      target: Number.isFinite(t) ? t : 0,
      actual: Number.isFinite(a) ? a : 0,
      evidenceUrl: url.trim(),
      note: note.trim(),
      status,
      updatedAt: now,
      submittedAt: status === 'Submitted' ? now : sub?.submittedAt,
      leaderNote: sub?.status === 'Rejected' ? sub.leaderNote : undefined,
    };
    setBusy(true);
    try {
      await onSave(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
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
        <summary className="cursor-pointer text-blue-700">Apa arti terlaksana sempurna (100%)?</summary>
        <div className="mt-2 space-y-1 bg-slate-50 rounded-lg p-3">
          <p><span className="font-medium">100% bila:</span> {def.perfect}</p>
          <p><span className="font-medium">Cara hitung:</span> {def.method}</p>
          <p><span className="font-medium">Bukti:</span> {def.evidence}</p>
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
          Target ({def.unit})
          <input className={inputCls} inputMode="decimal" value={target} disabled={locked}
            onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label className="text-xs text-slate-600">
          Tercapai ({def.unit})
          <input className={inputCls} inputMode="decimal" value={actual} disabled={locked}
            onChange={(e) => setActual(e.target.value)} />
        </label>
        <div className="text-xs text-slate-600">
          Realisasi
          <p className="mt-1.5 text-base font-semibold text-slate-900 tabular-nums">
            {ratio === null ? '-' : `${(ratio * 100).toFixed(1)}%`}
          </p>
        </div>
        <label className="text-xs text-slate-600 sm:col-span-4">
          Link bukti (Drive, folder, atau tautan file)
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
          <button type="button" disabled={busy} onClick={() => persist('Draft')}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
            Simpan draf
          </button>
          <button type="button" disabled={busy} onClick={() => persist('Submitted')}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50">
            Kirim ke leader
          </button>
        </div>
      )}
      {sub?.status === 'Validated' && (
        <p className="text-xs text-emerald-700">
          Divalidasi oleh {sub.validatedBy}
          {sub.leaderNote ? `: ${sub.leaderNote}` : ''}
        </p>
      )}
    </div>
  );
}

export function MyKpiInputView({ member, email, monthKey, submissions, onSave }: Props) {
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
            <p className="text-xs text-slate-500">{categoryForScore(score.validatedScore)}</p>
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
          email={email} monthKey={monthKey} onSave={onSave} />
      ))}
    </div>
  );
}
