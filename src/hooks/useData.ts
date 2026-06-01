import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database';
import type { Test, Question, Attempt, DashboardStats } from '../types';

/**
 * Hook for dashboard data — reactive via Dexie live queries.
 * Automatically re-renders when IndexedDB data changes (e.g. after cloud sync).
 */
export function useDashboard() {
  const tests = useLiveQuery(
    () => db.tests.orderBy('createdAt').reverse().toArray(),
    [],
    [] as Test[],
  );

  const stats = useLiveQuery(async (): Promise<DashboardStats> => {
    const [totalTests, totalQuestions, attempts] = await Promise.all([
      db.tests.count(),
      db.questions.count(),
      db.attempts.where('status').anyOf(['completed', 'auto-submitted', 'timed-out']).toArray(),
    ]);

    const scores = attempts.map(a => a.percentage);
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    let streak = 0;
    if (attempts.length > 0) {
      const sorted = attempts.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(today);
      for (let i = 0; i < 365; i++) {
        const dayStr = checkDate.toISOString().split('T')[0];
        const hasAttempt = sorted.some(a => a.startTime.startsWith(dayStr));
        if (hasAttempt) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      totalTests,
      totalQuestions,
      totalAttempts: attempts.length,
      bestScore: Math.round(bestScore * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      currentStreak: streak,
    };
  }, [], null);

  return { stats, tests, loading: stats === null };
}

/**
 * Hook for test data with attempts — reactive
 */
export function useTestData(testId: number | undefined) {
  const test = useLiveQuery(
    () => (testId ? db.tests.get(testId) : undefined),
    [testId],
    undefined as Test | undefined,
  );

  const questions = useLiveQuery(
    () => (testId ? db.questions.where('sourceTestId').equals(testId).toArray() : []),
    [testId],
    [] as Question[],
  );

  const attempts = useLiveQuery(
    () =>
      testId
        ? db.attempts.where('testId').equals(testId).toArray()
            .then(a => a.sort((x, y) => new Date(y.startTime).getTime() - new Date(x.startTime).getTime()))
        : [],
    [testId],
    [] as Attempt[],
  );

  // Consider "loading" until the test resolves on first mount
  const loading = testId !== undefined && test === undefined && questions.length === 0;

  return { test: test || null, questions, attempts, loading };
}

/**
 * Hook for question bank — reactive
 */
export function useQuestionBank() {
  const questions = useLiveQuery(
    () => db.questions.toArray(),
    [],
    [] as Question[],
  );

  const tags = useLiveQuery(async () => {
    const qs = await db.questions.toArray();
    const tagSet = new Set<string>();
    qs.forEach(q => q.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [], [] as string[]);

  return { questions, tags, loading: false };
}

/**
 * Hook for attempt history — reactive
 */
export function useAttemptHistory() {
  const attempts = useLiveQuery(
    () =>
      db.attempts
        .orderBy('startTime')
        .reverse()
        .toArray()
        .then(a => a.filter(att => att.status !== 'in-progress')),
    [],
    [] as Attempt[],
  );

  return { attempts, loading: false };
}
