import { useCallback, useEffect, useMemo, useState } from 'react';
import { TEAM_MEMBERS, WORKFLOW_USERS } from '@/config/team';
import {
  clearMonth,
  decideSubmission,
  getSessionUserId,
  loadAllSubmissions,
  saveSubmission,
  setSessionUserId,
  subscribeSubmissions,
} from '@/services/submissionStore';
import type { KpiSubmission } from '@/types/submission';

export function useKpiWorkflow(monthKey: string) {
  const [userId, setUserId] = useState<string | null>(() => getSessionUserId());
  const [all, setAll] = useState<KpiSubmission[]>(() => loadAllSubmissions());

  useEffect(() => subscribeSubmissions(() => setAll(loadAllSubmissions())), []);

  const currentUser = WORKFLOW_USERS.find((u) => u.id === userId) ?? null;
  const isLeader = currentUser?.isLeader ?? false;
  const member = TEAM_MEMBERS.find((m) => m.id === currentUser?.id);

  const submissions = useMemo(
    () =>
      all.filter(
        (s) => s.monthKey === monthKey && (isLeader || s.employeeId === currentUser?.id),
      ),
    [all, monthKey, isLeader, currentUser?.id],
  );

  const selectUser = useCallback((id: string | null) => {
    setSessionUserId(id);
    setUserId(id);
  }, []);

  const save = useCallback((sub: KpiSubmission) => saveSubmission(sub), []);

  const decide = useCallback(
    (sub: KpiSubmission, decision: 'Validated' | 'Rejected', note: string, score: number) => {
      if (!currentUser?.isLeader) return;
      decideSubmission(sub, decision, currentUser.name, note, score);
    },
    [currentUser],
  );

  const resetMonth = useCallback(() => clearMonth(monthKey), [monthKey]);

  return { currentUser, isLeader, member, selectUser, submissions, save, decide, resetMonth };
}
