import { useState } from 'react';
import { SectionCard } from '@/components/ui/SectionCard';
import { MONTHS, WORKFLOW_USERS, defaultMonthKey } from '@/config/team';
import { useKpiWorkflow } from '@/hooks/useKpiWorkflow';
import { LeaderValidationView } from './LeaderValidationView';
import { MyKpiInputView } from './MyKpiInputView';

export function KpiWorkflowView({ mode }: { mode: 'input' | 'validation' }) {
  const [monthKey, setMonthKey] = useState(defaultMonthKey());
  const wf = useKpiWorkflow(monthKey);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <label className="text-sm text-slate-600">
        Masuk sebagai{' '}
        <select className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
          value={wf.currentUser?.id ?? ''} onChange={(e) => wf.selectUser(e.target.value || null)}>
          <option value="">Pilih nama</option>
          {WORKFLOW_USERS.map((u) => (
            <option key={u.id} value={u.id}>{u.isLeader ? `${u.name} (Leader)` : u.name}</option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">
          Bulan{' '}
          <select className="border border-slate-300 rounded-lg px-2 py-1 text-sm" value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}>
            {MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
        <button type="button" className="text-xs text-red-600 underline cursor-pointer"
          onClick={() => {
            if (window.confirm('Hapus semua data KPI bulan ini di browser ini? Tidak bisa dibatalkan.')) wf.resetMonth();
          }}>
          Kosongkan data percobaan
        </button>
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (!wf.currentUser) {
    body = (
      <SectionCard title="Pilih nama Anda">
        <p className="text-sm text-slate-600">
          Pilih nama di kanan atas. Mode percobaan: data tersimpan di browser ini saja, belum dibagikan antar perangkat.
        </p>
      </SectionCard>
    );
  } else if (mode === 'input') {
    body = wf.member ? (
      <MyKpiInputView member={wf.member} monthKey={monthKey} submission={wf.submissions[0]} onSave={wf.save} />
    ) : (
      <SectionCard title="Input KPI Saya">
        <p className="text-sm text-slate-600">Leader tidak punya KPI sendiri. Buka menu Validasi Leader.</p>
      </SectionCard>
    );
  } else {
    body = wf.isLeader ? (
      <LeaderValidationView monthKey={monthKey} submissions={wf.submissions} onDecide={wf.decide} />
    ) : (
      <SectionCard title="Validasi Leader">
        <p className="text-sm text-slate-600">Menu ini hanya untuk leader. Pilih "Leader" di kanan atas.</p>
      </SectionCard>
    );
  }

  return (
    <>
      {header}
      {body}
    </>
  );
}
