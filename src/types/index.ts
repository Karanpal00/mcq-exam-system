// ===== Core Data Models =====

export interface Test {
  id?: number;
  userId?: string;
  name: string;
  description: string;
  duration: number; // minutes
  totalMarks: number;
  passingMarks: number;
  correctMark: number;
  wrongMark: number; // negative marking (e.g., -0.25)
  unansweredMark: number;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  name: string;
  order: number;
  questionIds: number[];
}

export interface Question {
  id?: number;
  userId?: string;
  text: string;
  options: string[];
  correctAnswer: number; // index 0-3 (A=0, B=1, C=2, D=3)
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  sectionName?: string;
  sourceTestId?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Attempt {
  id?: number;
  userId?: string;
  testId: number;
  testName: string;
  mode: 'exam' | 'study' | 'practice' | 'smart-retake';
  retakeType?: 'full' | 'wrong' | 'unanswered' | 'marked';
  startTime: string;
  endTime?: string;
  duration: number; // allowed duration in minutes
  durationUsed?: number; // actual seconds used
  score: number;
  totalMarks: number;
  percentage: number;
  correct: number;
  wrong: number;
  notAnswered: number;
  totalQuestions: number;
  status: 'in-progress' | 'completed' | 'auto-submitted' | 'timed-out';
  answers: Answer[];
  sectionOrder?: string[];
  questionOrder?: number[];
  updatedAt?: string;
}

export interface Answer {
  questionId: number;
  selectedAnswer: number | null; // null = not answered
  timeSpent: number; // seconds
  isMarked: boolean;
  isBookmarked: boolean;
  isCorrect?: boolean;
}

export interface Bookmark {
  id?: number;
  userId?: string;
  questionId: number;
  folder: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  id?: number;
  userId?: string;
  theme: 'light' | 'dark' | 'system';
  fullScreenExam: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showTimerWarnings: boolean;
  updatedAt?: string;
}

export interface SyncTombstone {
  id?: number;
  userId?: string;
  collectionName: CloudCollectionName;
  recordId: number;
  deletedAt: string;
}

export type CloudCollectionName = 'tests' | 'questionBank' | 'attempts' | 'bookmarks' | 'settings';

export interface CloudSyncSummary {
  pulled: number;
  pushed: number;
  deleted: number;
}

// ===== Exam State =====

export interface ExamState {
  attemptId: number | null;
  testId: number;
  currentQuestionIndex: number;
  currentSectionIndex: number;
  answers: Answer[];
  startTime: string;
  endTime: string; // when timer expires
  remainingSeconds: number;
  questionOrder: number[];
  sectionOrder: string[];
  isFullScreen: boolean;
  status: 'idle' | 'running' | 'paused' | 'submitting' | 'completed';
}

// ===== Import Types =====

export interface ImportResult {
  success: boolean;
  sections: ParsedSection[];
  questions: ParsedQuestion[];
  errors: ImportError[];
  warnings: string[];
}

export interface ParsedSection {
  name: string;
  questionCount: number;
}

export interface ParsedQuestion {
  sectionName: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  lineNumber: number;
}

export interface ImportError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

// ===== Analytics Types =====

export interface SectionAnalytics {
  sectionName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  accuracy: number;
  avgTimePerQuestion: number;
}

export interface PerformanceTrend {
  attemptId: number;
  date: string;
  score: number;
  percentage: number;
  timeTaken: number;
}

export interface WeakArea {
  tag: string;
  accuracy: number;
  totalAttempted: number;
  correct: number;
}

// ===== UI Types =====

export type QuestionStatus = 'not-visited' | 'visited' | 'answered' | 'marked' | 'marked-answered';

export interface DashboardStats {
  totalTests: number;
  totalQuestions: number;
  totalAttempts: number;
  bestScore: number;
  averageScore: number;
  currentStreak: number;
}
