export type SubmissionStatus = 'Draft' | 'Submitted' | 'Validated' | 'Rejected';

export interface KpiDefinition {
  id: string; // contoh: adhit-1
  employeeId: string;
  no: number;
  title: string;
  weight: number; // 0 - 1
  unit: string; // satuan hitung (jamaah, item checklist, dst)
  perfect: string; // arti terlaksana sempurna (100%)
  method: string; // cara menghitung realisasi
  evidence: string; // bukti yang harus disimpan
  example: string;
}

export interface KpiSubmission {
  id: string; // `${monthKey}_${kpiId}`
  kpiId: string;
  employeeId: string;
  ownerEmail: string;
  monthKey: string; // YYYY-MM
  target: number;
  actual: number;
  evidenceUrl: string;
  note: string;
  status: SubmissionStatus;
  updatedAt: string;
  submittedAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  leaderNote?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}
