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
  monthKey: string; // YYYY-MM, periode KPI yang dinilai
  /** Nilai final gabungan semua KPI bulan itu, dalam persen (0 - 120), diisi karyawan. */
  claimedScore: number;
  /** Link Google Sheet file KPI rinci, sebagai bahan pengecekan leader. */
  evidenceUrl: string;
  /** Nama tab/sheet dan sel yang berisi nilai final (contoh: "Rekap" dan "D12"). */
  sheetTab: string;
  scoreCell: string;
  /** Sel opsional yang berisi tulisan periode di file, untuk dicocokkan dengan periode KPI. */
  periodCell?: string;
  /** 'sheet' = nilai dibaca otomatis dari sel. 'manual' = diketik karyawan karena file belum terbaca. */
  scoreSource: 'sheet' | 'manual';
  /** Teks mentah sel yang terbaca saat dikirim. */
  fetchedRaw?: string;
  fetchedPeriodRaw?: string;
  fetchedAt?: string;
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
