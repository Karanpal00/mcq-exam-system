import type { Attempt, Question, SectionAnalytics, PerformanceTrend, WeakArea } from '../types';
import { attemptRepo, questionRepo } from '../db/repository';

/**
 * Get section-wise analytics for a specific attempt
 */
export function getSectionAnalytics(
  attempt: Attempt,
  questions: Question[],
  sectionNames: string[]
): SectionAnalytics[] {
  return sectionNames.map(sectionName => {
    const sectionQuestions = questions.filter(q => q.sectionName === sectionName);
    const sectionQuestionIds = new Set(sectionQuestions.map(q => q.id!));
    const sectionAnswers = attempt.answers.filter(a => sectionQuestionIds.has(a.questionId));

    const attempted = sectionAnswers.filter(a => a.selectedAnswer !== null).length;
    const correct = sectionAnswers.filter(a => a.isCorrect).length;
    const wrong = attempted - correct;
    const totalTime = sectionAnswers.reduce((sum, a) => sum + a.timeSpent, 0);

    return {
      sectionName,
      totalQuestions: sectionQuestions.length,
      attempted,
      correct,
      wrong,
      accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
      avgTimePerQuestion: sectionAnswers.length > 0 ? totalTime / sectionAnswers.length : 0,
    };
  });
}

/**
 * Get performance trends across attempts for a test
 */
export async function getPerformanceTrends(testId: number): Promise<PerformanceTrend[]> {
  const attempts = await attemptRepo.getByTestId(testId);
  return attempts
    .filter(a => a.status !== 'in-progress')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map(a => ({
      attemptId: a.id!,
      date: a.startTime,
      score: a.score,
      percentage: a.percentage,
      timeTaken: a.durationUsed || 0,
    }));
}

/**
 * Get weak areas by analyzing all attempts
 */
export async function getWeakAreas(): Promise<WeakArea[]> {
  const [attempts, allQuestions] = await Promise.all([
    attemptRepo.getAll(),
    questionRepo.getAll(),
  ]);

  const questionMap = new Map(allQuestions.map(q => [q.id!, q]));
  const tagStats: Record<string, { correct: number; total: number }> = {};

  for (const attempt of attempts) {
    if (attempt.status === 'in-progress') continue;

    for (const answer of attempt.answers) {
      if (answer.selectedAnswer === null) continue;

      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const tags = question.tags.length > 0 ? question.tags : [question.sectionName || 'General'];
      for (const tag of tags) {
        if (!tagStats[tag]) tagStats[tag] = { correct: 0, total: 0 };
        tagStats[tag].total++;
        if (answer.isCorrect) tagStats[tag].correct++;
      }
    }
  }

  return Object.entries(tagStats)
    .map(([tag, stats]) => ({
      tag,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      totalAttempted: stats.total,
      correct: stats.correct,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * Get time analytics for an attempt
 */
export function getTimeAnalytics(attempt: Attempt, questions: Question[]) {
  const questionMap = new Map(questions.map(q => [q.id!, q]));

  const questionTimes = attempt.answers
    .map(a => ({
      questionId: a.questionId,
      questionText: questionMap.get(a.questionId)?.text || 'Unknown',
      timeSpent: a.timeSpent,
      isCorrect: a.isCorrect || false,
      selectedAnswer: a.selectedAnswer,
    }))
    .filter(q => q.timeSpent > 0);

  const sorted = [...questionTimes].sort((a, b) => a.timeSpent - b.timeSpent);
  const avgTime = questionTimes.length > 0
    ? questionTimes.reduce((s, q) => s + q.timeSpent, 0) / questionTimes.length
    : 0;

  return {
    fastest: sorted.slice(0, 5),
    slowest: sorted.slice(-5).reverse(),
    averageTime: avgTime,
    totalTime: questionTimes.reduce((s, q) => s + q.timeSpent, 0),
    allTimes: questionTimes,
  };
}

/**
 * Get wrong questions from all attempts for a test
 */
export async function getIncorrectQuestions(testId: number): Promise<number[]> {
  const attempts = await attemptRepo.getByTestId(testId);
  const wrongIds = new Set<number>();

  for (const attempt of attempts) {
    if (attempt.status === 'in-progress') continue;
    for (const answer of attempt.answers) {
      if (answer.selectedAnswer !== null && !answer.isCorrect) {
        wrongIds.add(answer.questionId);
      }
    }
  }

  return Array.from(wrongIds);
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
