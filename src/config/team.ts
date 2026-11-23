import type { TeamMember } from '@/types/submission';

/**
 * ISI EMAIL GOOGLE ASLI sebelum dipakai. Email harus sama persis dengan akun Google
 * yang dipakai untuk login. Daftar ini juga harus disalin ke firestore.rules.
 */
export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'adhit', name: 'Adhit', role: 'Project & Operasional Umroh', email: 'adhit@contoh.com' },
  { id: 'fathur', name: 'Fathur', role: 'Marketing & Sales', email: 'fathur@contoh.com' },
  { id: 'amud', name: 'Amud', role: 'Admin & Dokumen', email: 'amud@contoh.com' },
  { id: 'mas-agus', name: 'Mas Agus', role: 'Lapangan & Logistik (External)', email: 'agus@contoh.com' },
];

/** Leader yang boleh memvalidasi. Leader tidak bisa memvalidasi KPI miliknya sendiri. */
export const LEADER_EMAILS: string[] = ['leader@contoh.com'];

/** Bulan penilaian yang tersedia di pilihan bulan. */
export const MONTHS: { key: string; label: string }[] = [
  { key: '2026-10', label: 'Okt 2026' },
  { key: '2026-11', label: 'Nov 2026' },
  { key: '2026-12', label: 'Des 2026' },
];

/** Batas skor maksimum per KPI (sama dengan Excel: 120%). */
export const SCORE_CAP = 1.2;

export function defaultMonthKey(now = new Date()): string {
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return MONTHS.some((m) => m.key === key) ? key : MONTHS[0].key;
}

export function findMemberByEmail(email: string | null | undefined): TeamMember | undefined {
  if (!email) return undefined;
  const e = email.toLowerCase();
  return TEAM_MEMBERS.find((m) => m.email.toLowerCase() === e);
}

export function isLeaderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return LEADER_EMAILS.some((l) => l.toLowerCase() === e);
}
