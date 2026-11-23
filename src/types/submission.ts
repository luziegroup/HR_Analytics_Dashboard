export type SubmissionStatus = 'Draft' | 'Submitted' | 'Validated' | 'Rejected';

export interface KpiDefinition {
  id: string; // contoh: adhit-1
  employeeId: string;
  no: number;
  title: string;
  weight: number; // 0 - 1
  unit: string;
  perfect: string; // arti terlaksana sempurna (100%)
  method: string; // cara menghitung skor di file KPI pendukung
  evidence: string; // file bukti yang harus dilampirkan
  example: string;
}

export interface KpiSubmission {
  id: string; // `${monthKey}_${employeeId}`
  employeeId: string;
  monthKey: string; // YYYY-MM
  /** Nilai final gabungan semua KPI bulan itu, dalam persen (0 - 120), diisi karyawan. */
  claimedScore: number;
  /** Link file KPI rinci (Drive, spreadsheet, folder) sebagai bahan pengecekan leader. */
  evidenceUrl: string;
  note: string;
  status: SubmissionStatus;
  updatedAt: string;
  submittedAt?: string;
  /** Nilai final setelah diperiksa leader. Bisa sama dengan claimedScore atau dikoreksi. */
  validatedScore?: number;
  validatedBy?: string;
  validatedAt?: string;
  leaderNote?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface WorkflowUser {
  id: string;
  name: string;
  isLeader: boolean;
}
