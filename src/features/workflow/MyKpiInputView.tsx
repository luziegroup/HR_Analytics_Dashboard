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
import {
  extractSheetId,
  fetchSheetCell,
  normalizeCell,
  parseScoreText,
  periodMatches,
} from '@/utils/sheetReader';
import { KpiReferenceList } from './KpiReferenceList';
import { StatusBadge } from './StatusBadge';

interface Props {
  member: TeamMember;
  monthKey: string;
  submission?: KpiSubmission;
  onSave: (sub: KpiSubmission) => void;
}

interface ReadResult {
  score: number;
  raw: string;
  note?: string;
  periodRaw?: string;
  periodOk?: boolean;
  at: string;
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-500';

export function MyKpiInputView({ member, monthKey, submission, onSave }: Props) {
  const [url, setUrl] = useState('');
  const [tab, setTab] = useState('');
  const [cell, setCell] = useState('');
  const [periodCell, setPeriodCell] = useState('');
  const [note, setNote] = useState('');
  const [manual, setManual] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(submission?.evidenceUrl ?? '');
    setTab(submission?.sheetTab ?? '');
    setCell(submission?.scoreCell ?? '');
    setPeriodCell(submission?.periodCell ?? '');
    setNote(submission?.note ?? '');
    setManualMode(submission?.scoreSource === 'manual');
    setManual(submission?.scoreSource === 'manual' ? String(submission.claimedScore) : '');
    setResult(
      submission?.scoreSource === 'sheet' && submission.fetchedAt
        ? {
            score: submission.claimedScore,
            raw: submission.fetchedRaw ?? '',
            periodRaw: submission.fetchedPeriodRaw,
            periodOk: submission.fetchedPeriodRaw
              ? periodMatches(submission.fetchedPeriodRaw, monthKey)
              : undefined,
            at: submission.fetchedAt,
          }
        : null,
    );
    setError(null);
  }, [monthKey, submission?.updatedAt, submission?.status]);

  const monthLabel = MONTHS.find((m) => m.key === monthKey)?.label ?? monthKey;
  const locked = submission?.status === 'Submitted' || submission?.status === 'Validated';
  const official = officialScorePct(submission);

  const clearResult = () => setResult(null);

  const readFromSheet = async () => {
    setError(null);
    const c = normalizeCell(cell);
    const pc = periodCell.trim() ? normalizeCell(periodCell) : null;
    if (!isValidEvidenceUrl(url) || !extractSheetId(url)) return setError('Isi link Google Sheet yang benar.');
    if (!tab.trim()) return setError('Isi nama tab (sheet) yang berisi nilai final.');
    if (!c) return setError('Sel nilai final tidak valid. Contoh: D12.');
    if (periodCell.trim() && !pc) return setError('Sel periode tidak valid. Contoh: B2.');
    setReading(true);
    try {
      const raw = await fetchSheetCell(url, tab.trim(), c);
      const parsed = parseScoreText(raw);
      if (!parsed) throw new Error(`Isi sel "${raw}" bukan angka nilai.`);
      if (parsed.pct < 0 || parsed.pct > SCORE_CAP_PCT) {
        throw new Error(`Nilai ${parsed.pct}% di luar batas 0 sampai ${SCORE_CAP_PCT}.`);
      }
      let periodRaw: string | undefined;
      if (pc) {
        try {
          periodRaw = await fetchSheetCell(url, tab.trim(), pc);
        } catch {
          periodRaw = undefined;
        }
      }
      setResult({
        score: parsed.pct,
        raw,
        note: parsed.note,
        periodRaw,
        periodOk: periodRaw ? periodMatches(periodRaw, monthKey) : undefined,
        at: new Date().toISOString(),
      });
      setManualMode(false);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'Gagal membaca file.');
    } finally {
      setReading(false);
    }
  };

  const persist = (status: 'Draft' | 'Submitted') => {
    setError(null);
    const c = normalizeCell(cell);
    const manualScore = parseScore(manual);
    const useSheet = !manualMode && result !== null;
    const score = useSheet ? result.score : manualScore;

    if (status === 'Submitted') {
      if (!isValidEvidenceUrl(url)) return setError('Link Google Sheet wajib diisi (diawali https://).');
      if (!tab.trim()) return setError('Nama tab wajib diisi.');
      if (!c) return setError('Sel nilai final wajib diisi dengan benar. Contoh: D12.');
      if (score === null) {
        return setError(
          manualMode
            ? `Isi nilai manual antara 0 dan ${SCORE_CAP_PCT}.`
            : 'Klik "Baca nilai dari file" dulu agar nilai diambil dari sel.',
        );
      }
      if (useSheet && result.periodOk === false) {
        return setError(`Periode di file ("${result.periodRaw}") tidak cocok dengan periode KPI ${monthLabel}.`);
      }
    }
    const now = new Date().toISOString();
    onSave({
      id: submissionId(monthKey, member.id),
      employeeId: member.id,
      monthKey,
      claimedScore: score ?? 0,
      evidenceUrl: url.trim(),
      sheetTab: tab.trim(),
      scoreCell: c ?? cell.trim().toUpperCase(),
      periodCell: periodCell.trim() ? periodCell.trim().toUpperCase() : undefined,
      scoreSource: useSheet ? 'sheet' : 'manual',
      fetchedRaw: useSheet ? result.raw : undefined,
      fetchedPeriodRaw: useSheet ? result.periodRaw : undefined,
      fetchedAt: useSheet ? result.at : undefined,
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
        title={`Nilai final KPI ${member.name}`}
        subtitle={`${member.role}. Periode KPI: ${monthLabel}`}
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
        title={`Kirim nilai final periode ${monthLabel}`}
        subtitle="Cukup tunjukkan sel yang berisi nilai final di file KPI Anda. Nilainya dibaca dari file, bukan diketik."
      >
        <div className="space-y-4">
          <KpiReferenceList employeeId={member.id} title="Lihat KPI Anda, bobot, dan apa yang akan dicek leader" />

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs text-slate-600 sm:col-span-4">
              Link Google Sheet file KPI (akses: siapa saja yang memiliki link, pelihat)
              <input className={inputCls} placeholder="https://docs.google.com/spreadsheets/d/..." value={url}
                disabled={locked} onChange={(e) => { setUrl(e.target.value); clearResult(); }} />
            </label>
            <label className="text-xs text-slate-600 sm:col-span-2">
              Nama tab (sheet)
              <input className={inputCls} placeholder="contoh: Rekap" value={tab}
                disabled={locked} onChange={(e) => { setTab(e.target.value); clearResult(); }} />
            </label>
            <label className="text-xs text-slate-600">
              Sel nilai final
              <input className={inputCls} placeholder="contoh: D12" value={cell}
                disabled={locked} onChange={(e) => { setCell(e.target.value); clearResult(); }} />
            </label>
            <label className="text-xs text-slate-600">
              Sel periode (opsional)
              <input className={inputCls} placeholder="contoh: B2" value={periodCell}
                disabled={locked} onChange={(e) => { setPeriodCell(e.target.value); clearResult(); }} />
            </label>
          </div>

          {!locked && (
            <div className="space-y-3">
              <button type="button" disabled={reading} onClick={readFromSheet}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-900 cursor-pointer disabled:opacity-50">
                {reading ? 'Membaca...' : 'Baca nilai dari file'}
              </button>

              {result && (
                <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                  <p>
                    Nilai terbaca: <span className="font-semibold tabular-nums">{result.score}%</span>
                    <span className="text-xs text-slate-500"> (isi sel: "{result.raw}")</span>
                  </p>
                  {result.note && <p className="text-xs text-slate-600">{result.note}</p>}
                  {result.periodRaw !== undefined && (
                    <p className={`text-xs ${result.periodOk ? 'text-emerald-700' : 'text-red-700'}`}>
                      Periode di file: "{result.periodRaw}".{' '}
                      {result.periodOk ? `Cocok dengan ${monthLabel}.` : `Tidak cocok dengan ${monthLabel}.`}
                    </p>
                  )}
                </div>
              )}

              {!result && (
                <div className="text-xs text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={manualMode} onChange={(e) => setManualMode(e.target.checked)} />
                    File belum bisa dibaca otomatis, isi nilai manual (akan ditandai untuk dicek leader)
                  </label>
                  {manualMode && (
                    <label className="block mt-2 max-w-xs">
                      Nilai final (%)
                      <input className={inputCls} inputMode="decimal" placeholder="contoh: 92,5" value={manual}
                        onChange={(e) => setManual(e.target.value)} />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="block text-xs text-slate-600">
            Catatan untuk leader (opsional)
            <input className={inputCls} value={note} disabled={locked} onChange={(e) => setNote(e.target.value)} />
          </label>

          <p className="text-xs text-slate-500">
            Dengan mengirim, Anda bertanggung jawab bahwa link, tab, dan sel di atas benar-benar berisi nilai final KPI periode {monthLabel}.
          </p>

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
