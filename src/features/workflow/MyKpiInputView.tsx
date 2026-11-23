import { useEffect, useState } from 'react';
import { SectionCard } from '@/components/ui/SectionCard';
import { MONTHS, SCORE_CAP_PCT } from '@/config/team';
import { submissionId } from '@/services/submissionStore';
import type { KpiSubmission, TeamMember } from '@/types/submission';
import {
  categoryForScorePct,
  isValidEvidenceUrl,
  officialScorePct,
  parseScore,
} from '@/utils/kpiSubmissionScoring';
import { KpiReferenceList } from './KpiReferenceList';
import { StatusBadge } from './StatusBadge';

interface Props {
  member: TeamMember;
  monthKey: string;
  submission?: KpiSubmission;
  onSave: (sub: KpiSubmission) => void;
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-500';

export function MyKpiInputView({ member, monthKey, submission, onSave }: Props) {
  const [score, setScore] = useState(submission ? String(submission.claimedScore) : '');
  const [url, setUrl] = useState(submission?.evidenceUrl ?? '');
  const [note, setNote] = useState(submission?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScore(submission ? String(submission.claimedScore) : '');
    setUrl(submission?.evidenceUrl ?? '');
    setNote(submission?.note ?? '');
    setError(null);
  }, [monthKey, submission?.updatedAt, submission?.status]);

  const monthLabel = MONTHS.find((m) => m.key === monthKey)?.label ?? monthKey;
  const locked = submission?.status === 'Submitted' || submission?.status === 'Validated';
  const official = officialScorePct(submission);

  const persist = (status: 'Draft' | 'Submitted') => {
    setError(null);
    const n = parseScore(score);
    if (status === 'Submitted') {
      if (n === null) return setError(`Isi nilai final antara 0 dan ${SCORE_CAP_PCT}.`);
      if (!isValidEvidenceUrl(url)) {
        return setError('Link file KPI rinci wajib diisi (diawali https://).');
      }
    }
    const now = new Date().toISOString();
    onSave({
      id: submissionId(monthKey, member.id),
      employeeId: member.id,
      monthKey,
      claimedScore: n ?? 0,
      evidenceUrl: url.trim(),
      note: note.trim(),
      status,
      updatedAt: now,
      submittedAt: status === 'Submitted' ? now : submission?.submittedAt,
      leaderNote: submission?.status === 'Rejected' ? submission.leaderNote : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Nilai final KPI ${member.name} (${monthLabel})`}
        subtitle={member.role}
        action={<StatusBadge status={submission?.status} />}
      >
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Nilai resmi (setelah divalidasi)</p>
            <p className="text-3xl font-semibold tabular-nums">
              {official === null ? '-' : `${official.toFixed(1)}%`}
            </p>
            <p className="text-xs text-slate-500">
              {official === null ? 'Belum divalidasi leader' : categoryForScorePct(official)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Nilai yang Anda kirim</p>
            <p className="text-3xl font-semibold tabular-nums">
              {submission && submission.status !== 'Draft' ? `${submission.claimedScore}%` : '-'}
            </p>
          </div>
        </div>
        {submission?.status === 'Rejected' && submission.leaderNote && (
          <p className="mt-4 text-xs bg-red-50 text-red-700 rounded-lg p-2.5">
            Dikembalikan leader: {submission.leaderNote}
          </p>
        )}
        {submission?.status === 'Validated' && (
          <p className="mt-4 text-xs text-emerald-700">
            Divalidasi {submission.validatedBy}
            {submission.validatedScore !== submission.claimedScore
              ? ` dan dikoreksi dari ${submission.claimedScore}% menjadi ${submission.validatedScore}%`
              : ''}
            {submission.leaderNote ? `. ${submission.leaderNote}` : ''}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Kirim nilai final bulan ini"
        subtitle="Isi nilai final gabungan semua KPI Anda. Leader akan mengecek angkanya dengan file KPI rinci."
      >
        <div className="space-y-4">
          <KpiReferenceList employeeId={member.id} title="Lihat KPI Anda, bobot, dan apa yang akan dicek leader" />

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs text-slate-600">
              Nilai final (%)
              <input className={inputCls} inputMode="decimal" placeholder="contoh: 92,5" value={score}
                disabled={locked} onChange={(e) => setScore(e.target.value)} />
            </label>
            <label className="text-xs text-slate-600 sm:col-span-3">
              Link file KPI rinci (Sheet atau Drive)
              <input className={inputCls} placeholder="https://docs.google.com/spreadsheets/..." value={url}
                disabled={locked} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <label className="text-xs text-slate-600 sm:col-span-4">
              Catatan untuk leader (opsional)
              <input className={inputCls} value={note} disabled={locked}
                onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {locked ? (
            <p className="text-xs text-slate-500">
              {submission?.status === 'Submitted'
                ? 'Sudah dikirim dan menunggu validasi leader.'
                : 'Sudah divalidasi, tidak bisa diubah.'}
            </p>
          ) : (
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
        </div>
      </SectionCard>
    </div>
  );
}
