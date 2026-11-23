import { useState } from 'react';
import { SectionCard } from '@/components/ui/SectionCard';
import { MONTHS, defaultMonthKey } from '@/config/team';
import { useKpiWorkflow } from '@/hooks/useKpiWorkflow';
import { LeaderValidationView } from './LeaderValidationView';
import { MyKpiInputView } from './MyKpiInputView';

export function KpiWorkflowView({ mode }: { mode: 'input' | 'validation' }) {
  const [monthKey, setMonthKey] = useState(defaultMonthKey());
  const wf = useKpiWorkflow(monthKey);

  if (wf.authLoading) return <p className="text-sm text-slate-500">Memuat sesi...</p>;

  if (!wf.user) {
    return (
      <SectionCard title="Masuk dengan Google" subtitle="Gunakan akun Google yang didaftarkan oleh admin.">
        <button type="button" onClick={wf.signIn}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
          Masuk dengan Google
        </button>
        {wf.authError && <p className="mt-3 text-xs text-red-600">{wf.authError}</p>}
      </SectionCard>
    );
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="text-sm text-slate-600">
        Masuk sebagai <span className="font-medium text-slate-900">{wf.email}</span>
        {wf.isLeader ? ' (Leader)' : wf.member ? ` (${wf.member.name})` : ''}
        <button type="button" onClick={wf.signOut} className="ml-3 text-blue-700 underline cursor-pointer">Keluar</button>
      </div>
      <label className="text-sm text-slate-600">
        Bulan{' '}
        <select className="border border-slate-300 rounded-lg px-2 py-1 text-sm" value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}>
          {MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </label>
    </div>
  );

  if (!wf.isLeader && !wf.member) {
    return (
      <>
        {header}
        <SectionCard title="Akun belum terdaftar">
          <p className="text-sm text-slate-600">
            Email {wf.email} belum ada di daftar tim. Hubungi admin untuk menambahkannya.
          </p>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      {header}
      {wf.dataError && (
        <p className="mb-4 text-sm bg-red-50 text-red-700 rounded-lg p-3">{wf.dataError}</p>
      )}
      {mode === 'input' ? (
        wf.member && wf.email ? (
          <MyKpiInputView member={wf.member} email={wf.email} monthKey={monthKey}
            submissions={wf.submissions} onSave={wf.save} />
        ) : (
          <SectionCard title="Input KPI">
            <p className="text-sm text-slate-600">Akun leader ini tidak punya KPI sendiri. Buka menu Validasi Leader.</p>
          </SectionCard>
        )
      ) : wf.isLeader && wf.email ? (
        <LeaderValidationView leaderEmail={wf.email} submissions={wf.submissions} onDecide={wf.decide} />
      ) : (
        <SectionCard title="Validasi Leader">
          <p className="text-sm text-slate-600">Menu ini hanya untuk leader.</p>
        </SectionCard>
      )}
    </>
  );
}
