import { useState, useEffect, useCallback } from 'react';
import type { Test, Question, Attempt, DashboardStats } from '../types';
import { testRepo, questionRepo, attemptRepo, statsRepo } from '../db/repository';

/**
 * Hook for dashboard data
 */
export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [s, t] = await Promise.all([
      statsRepo.getDashboardStats(),
      testRepo.getAll(),
    ]);
    setStats(s);
    setTests(t);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, tests, loading, refresh };
}

/**
 * Hook for test data with attempts
 */
export function useTestData(testId: number | undefined) {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!testId) return;
    setLoading(true);
    const [t, q, a] = await Promise.all([
      testRepo.getById(testId),
      questionRepo.getByTestId(testId),
      attemptRepo.getByTestId(testId),
    ]);
    setTest(t || null);
    setQuestions(q);
    setAttempts(a);
    setLoading(false);
  }, [testId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { test, questions, attempts, loading, refresh };
}

/**
 * Hook for question bank
 */
export function useQuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [q, t] = await Promise.all([
      questionRepo.getAll(),
      questionRepo.getAllTags(),
    ]);
    setQuestions(q);
    setTags(t);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { questions, tags, loading, refresh };
}

/**
 * Hook for attempt history
 */
export function useAttemptHistory() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const a = await attemptRepo.getAll();
    setAttempts(a.filter(att => att.status !== 'in-progress'));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { attempts, loading, refresh };
}
