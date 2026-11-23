import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { app } from '@/services/googleAuth';
import type { KpiSubmission } from '@/types/submission';

const db = getFirestore(app);
const COLLECTION = 'submissions';

export function submissionId(monthKey: string, kpiId: string): string {
  return `${monthKey}_${kpiId}`;
}

/** Leader (ownerEmail = null) membaca semua kiriman bulan itu; karyawan hanya miliknya. */
export function subscribeSubmissions(
  monthKey: string,
  ownerEmail: string | null,
  onData: (items: KpiSubmission[]) => void,
  onError: (message: string) => void,
) {
  const base = collection(db, COLLECTION);
  const q = ownerEmail
    ? query(base, where('monthKey', '==', monthKey), where('ownerEmail', '==', ownerEmail))
    : query(base, where('monthKey', '==', monthKey));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as KpiSubmission)),
    (err) => onError(err.message),
  );
}

export async function saveSubmission(sub: KpiSubmission): Promise<void> {
  const clean = Object.fromEntries(Object.entries(sub).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, COLLECTION, sub.id), clean);
}

export async function decideSubmission(
  sub: KpiSubmission,
  decision: 'Validated' | 'Rejected',
  leaderEmail: string,
  leaderNote: string,
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, COLLECTION, sub.id), {
    status: decision,
    validatedBy: leaderEmail,
    validatedAt: now,
    leaderNote,
    updatedAt: now,
  });
}
