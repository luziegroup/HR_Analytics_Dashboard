import type { TeamMember, WorkflowUser } from '@/types/submission';

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'adhit', name: 'Adhit', role: 'Project & Operasional Umroh' },
  { id: 'fathur', name: 'Fathur', role: 'Marketing & Sales' },
  { id: 'amud', name: 'Amud', role: 'Admin & Dokumen' },
  { id: 'mas-agus', name: 'Mas Agus', role: 'Lapangan & Logistik (External)' },
];

/** Ubah nama leader sesuai kebutuhan. Leader tidak punya KPI sendiri di aplikasi ini. */
export const LEADER: WorkflowUser = { id: 'leader', name: 'Leader', isLeader: true };

export const WORKFLOW_USERS: WorkflowUser[] = [
  ...TEAM_MEMBERS.map((m) => ({ id: m.id, name: m.name, isLeader: false })),
  LEADER,
];

export const MONTHS: { key: string; label: string }[] = [
  { key: '2026-10', label: 'Okt 2026' },
  { key: '2026-11', label: 'Nov 2026' },
  { key: '2026-12', label: 'Des 2026' },
];

/** Skor per KPI paling tinggi 120% (sama dengan Excel). */
export const SCORE_CAP_PCT = 120;

export function defaultMonthKey(now = new Date()): string {
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return MONTHS.some((m) => m.key === key) ? key : MONTHS[0].key;
}
