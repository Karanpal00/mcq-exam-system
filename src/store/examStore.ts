import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ExamState, Answer, Question, Test, Attempt } from '../types';
import { attemptRepo, bookmarkRepo } from '../db/repository';

interface ExamStore {
  // State
  examState: ExamState | null;
  questions: Question[];
  test: Test | null;
  isLoading: boolean;

  // Actions
  startExam: (test: Test, questions: Question[], mode?: 'exam' | 'study' | 'practice' | 'smart-retake', retakeType?: string) => Promise<void>;
  resumeExam: (attempt: Attempt, test: Test, questions: Question[]) => void;
  selectAnswer: (questionIndex: number, answerIndex: number) => void;
  clearAnswer: (questionIndex: number) => void;
  toggleMark: (questionIndex: number) => void;
  toggleBookmark: (questionIndex: number) => Promise<void>;
  navigateToQuestion: (index: number) => void;
  navigateToSection: (sectionIndex: number) => void;
  updateTimer: (remainingSeconds: number) => void;
  submitExam: () => Promise<Attempt | null>;
  recordTimeSpent: (questionIndex: number, seconds: number) => void;
  resetExam: () => void;
  saveProgress: () => Promise<void>;
}

const EXAM_STATE_KEY = 'mcq_exam_state';

function saveExamStateToLS(state: ExamState | null) {
  if (state) {
    localStorage.setItem(EXAM_STATE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(EXAM_STATE_KEY);
  }
}

export function loadExamStateFromLS(): ExamState | null {
  const stored = localStorage.getItem(EXAM_STATE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const useExamStore = create<ExamStore>()(
  subscribeWithSelector((set, get) => ({
    examState: null,
    questions: [],
    test: null,
    isLoading: false,

    startExam: async (test, questions, mode = 'exam', retakeType) => {
      const randomize = localStorage.getItem('mcq_randomize') === 'true';
      const questionOrder = randomize
        ? shuffleArray(questions.map((_, i) => i))
        : questions.map((_, i) => i);

      const sectionOrder = test.sections.map(s => s.id);

      const now = new Date();
      const endTime = mode === 'study'
        ? '' // No timer for study mode
        : new Date(now.getTime() + test.duration * 60 * 1000).toISOString();

      const bookmarkedIds = new Set((await bookmarkRepo.getAll()).map(b => b.questionId));
      const answers: Answer[] = questions.map((q, idx) => ({
        questionId: q.id!,
        selectedAnswer: null,
        timeSpent: 0,
        isMarked: false,
        isBookmarked: bookmarkedIds.has(q.id!),
        isVisited: idx === 0,
      }));

      // Create attempt record
      const attemptId = await attemptRepo.create({
        testId: test.id!,
        testName: test.name,
        mode: mode,
        retakeType: retakeType as 'full' | 'wrong' | 'unanswered' | 'marked' | undefined,
        startTime: now.toISOString(),
        duration: test.duration,
        score: 0,
        totalMarks: test.totalMarks,
        percentage: 0,
        correct: 0,
        wrong: 0,
        notAnswered: questions.length,
        totalQuestions: questions.length,
        status: 'in-progress',
        answers,
        sectionOrder,
        questionOrder: questionOrder.map(i => questions[i].id!),
      });

      const examState: ExamState = {
        attemptId,
        testId: test.id!,
        currentQuestionIndex: 0,
        currentSectionIndex: 0,
        answers,
        startTime: now.toISOString(),
        endTime,
        remainingSeconds: mode === 'study' ? Infinity : test.duration * 60,
        questionOrder,
        sectionOrder,
        isFullScreen: false,
        status: 'running',
      };

      saveExamStateToLS(examState);
      set({ examState, questions, test, isLoading: false });
    },

    resumeExam: (attempt, test, questions) => {
      const savedState = loadExamStateFromLS();
      if (savedState && savedState.attemptId === attempt.id) {
        set({ examState: savedState, questions, test });
      } else {
        // Reconstruct from attempt
        const examState: ExamState = {
          attemptId: attempt.id!,
          testId: test.id!,
          currentQuestionIndex: 0,
          currentSectionIndex: 0,
          answers: attempt.answers,
          startTime: attempt.startTime,
          endTime: new Date(new Date(attempt.startTime).getTime() + attempt.duration * 60 * 1000).toISOString(),
          remainingSeconds: Math.max(0,
            Math.floor((new Date(attempt.startTime).getTime() + attempt.duration * 60 * 1000 - Date.now()) / 1000)
          ),
          questionOrder: attempt.questionOrder
            ? attempt.questionOrder.map(qId => questions.findIndex(q => q.id === qId)).filter(idx => idx >= 0)
            : questions.map((_, i) => i),
          sectionOrder: attempt.sectionOrder || test.sections.map(s => s.id),
          isFullScreen: false,
          status: 'running',
        };
        saveExamStateToLS(examState);
        set({ examState, questions, test });
      }
    },

    selectAnswer: (questionIndex, answerIndex) => {
      const state = get().examState;
      if (!state) return;

      const newAnswers = [...state.answers];
      newAnswers[questionIndex] = {
        ...newAnswers[questionIndex],
        selectedAnswer: answerIndex,
      };

      const newState = { ...state, answers: newAnswers };
      saveExamStateToLS(newState);
      set({ examState: newState });
    },

    clearAnswer: (questionIndex) => {
      const state = get().examState;
      if (!state) return;

      const newAnswers = [...state.answers];
      newAnswers[questionIndex] = {
        ...newAnswers[questionIndex],
        selectedAnswer: null,
      };

      const newState = { ...state, answers: newAnswers };
      saveExamStateToLS(newState);
      set({ examState: newState });
    },

    toggleMark: (questionIndex) => {
      const state = get().examState;
      if (!state) return;

      const newAnswers = [...state.answers];
      newAnswers[questionIndex] = {
        ...newAnswers[questionIndex],
        isMarked: !newAnswers[questionIndex].isMarked,
      };

      const newState = { ...state, answers: newAnswers };
      saveExamStateToLS(newState);
      set({ examState: newState });
    },

    toggleBookmark: async (questionIndex) => {
      const state = get().examState;
      if (!state) return;

      const newAnswers = [...state.answers];
      const nextBookmarked = !newAnswers[questionIndex].isBookmarked;
      newAnswers[questionIndex] = {
        ...newAnswers[questionIndex],
        isBookmarked: nextBookmarked,
      };

      const newState = { ...state, answers: newAnswers };
      saveExamStateToLS(newState);
      set({ examState: newState });

      const questionId = newAnswers[questionIndex].questionId;
      if (nextBookmarked) {
        await bookmarkRepo.add({
          questionId,
          folder: 'Default',
          createdAt: new Date().toISOString(),
        });
      } else {
        await bookmarkRepo.remove(questionId, 'Default');
      }
    },

    navigateToQuestion: (index) => {
      const state = get().examState;
      if (!state) return;

      const newAnswers = [...state.answers];
      if (newAnswers[index] && !newAnswers[index].isVisited) {
        newAnswers[index] = {
          ...newAnswers[index],
          isVisited: true,
        };
      }

      const newState = {
        ...state,
        currentQuestionIndex: index,
        answers: newAnswers,
      };
      saveExamStateToLS(newState);
      set({ examState: newState });
    },

    navigateToSection: (sectionIndex) => {
      const state = get().examState;
      if (!state) return;

      const newState = { ...state, currentSectionIndex: sectionIndex };
      saveExamStateToLS(newState);
      set({ examState: newState });
    },

    updateTimer: (remainingSeconds) => {
      const state = get().examState;
      if (!state) return;

      const newState = { ...state, remainingSeconds };
      saveExamStateToLS(newState);
      set({ examState: newState });
    },

    recordTimeSpent: (questionIndex, seconds) => {
      const state = get().examState;
      if (!state) return;

      const newAnswers = [...state.answers];
      newAnswers[questionIndex] = {
        ...newAnswers[questionIndex],
        timeSpent: newAnswers[questionIndex].timeSpent + seconds,
      };

      const newState = { ...state, answers: newAnswers };
      // Don't save to LS on every second — too frequent
      set({ examState: newState });
    },

    submitExam: async () => {
      const state = get().examState;
      const questions = get().questions;
      const test = get().test;
      if (!state || !test) return null;

      const now = new Date();
      const startTime = new Date(state.startTime);
      const durationUsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      // Calculate results
      let correct = 0;
      let wrong = 0;
      let notAnswered = 0;

      const gradedAnswers = state.answers.map((answer, idx) => {
        const question = questions[state.questionOrder[idx]];
        if (!question) return answer;
        
        if (answer.selectedAnswer === null) {
          notAnswered++;
          return { ...answer, isCorrect: false };
        }

        const isCorrect = answer.selectedAnswer === question.correctAnswer;
        if (isCorrect) correct++;
        else wrong++;

        return { ...answer, isCorrect };
      });

      // Calculate score with marking scheme
      const score = (correct * test.correctMark) + (wrong * test.wrongMark) + (notAnswered * test.unansweredMark);
      const percentage = test.totalMarks > 0 ? (Math.max(0, score) / test.totalMarks) * 100 : 0;

      const attempt: Partial<Attempt> = {
        endTime: now.toISOString(),
        durationUsed,
        score: Math.round(score * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        correct,
        wrong,
        notAnswered,
        status: state.remainingSeconds <= 0 ? 'timed-out' : 'completed',
        answers: gradedAnswers,
      };

      await attemptRepo.update(state.attemptId!, attempt);

      // Clear exam state
      saveExamStateToLS(null);
      set({ examState: null });

      const fullAttempt = await attemptRepo.getById(state.attemptId!);
      return fullAttempt || null;
    },

    saveProgress: async () => {
      const state = get().examState;
      if (!state || !state.attemptId) return;

      await attemptRepo.update(state.attemptId, {
        answers: state.answers,
      });
    },

    resetExam: () => {
      saveExamStateToLS(null);
      set({ examState: null, questions: [], test: null });
    },
  }))
);
