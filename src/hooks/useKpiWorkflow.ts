import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { findMemberByEmail, isLeaderEmail } from '@/config/team';
import { signInBasic, logout, subscribeAuthUser } from '@/services/googleAuth';
import {
  decideSubmission,
  saveSubmission,
  subscribeSubmissions,
} from '@/services/submissionService';
import type { KpiSubmission, TeamMember } from '@/types/submission';

export function useKpiWorkflow(monthKey: string) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<KpiSubmission[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAuthUser((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const email = user?.email?.toLowerCase() ?? null;
  const member: TeamMember | undefined = useMemo(() => findMemberByEmail(email), [email]);
  const isLeader = isLeaderEmail(email);

  useEffect(() => {
    setSubmissions([]);
    setDataError(null);
    if (!email || (!isLeader && !member)) return;
    return subscribeSubmissions(
      monthKey,
      isLeader ? null : email,
      setSubmissions,
      (m) =>
        setDataError(
          `${m} Pastikan Firestore sudah aktif dan aturan keamanan (firestore.rules) sudah dipasang.`,
        ),
    );
  }, [monthKey, email, isLeader, member]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      await signInBasic();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Gagal masuk dengan Google.');
    }
  }, []);

  const signOut = useCallback(() => logout(), []);

  const save = useCallback((sub: KpiSubmission) => saveSubmission(sub), []);

  const decide = useCallback(
    (sub: KpiSubmission, decision: 'Validated' | 'Rejected', note: string) => {
      if (!email) return Promise.reject(new Error('Belum masuk.'));
      return decideSubmission(sub, decision, email, note);
    },
    [email],
  );

  return {
    user,
    email,
    member,
    isLeader,
    authLoading,
    authError,
    signIn,
    signOut,
    submissions,
    dataError,
    save,
    decide,
  };
}
