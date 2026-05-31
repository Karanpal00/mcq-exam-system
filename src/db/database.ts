import Dexie, { type Table } from 'dexie';
import type { Test, Question, Attempt, Bookmark, AppSettings } from '../types';

class MCQDatabase extends Dexie {
  tests!: Table<Test, number>;
  questions!: Table<Question, number>;
  attempts!: Table<Attempt, number>;
  bookmarks!: Table<Bookmark, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('MCQExamSystem');

    this.version(1).stores({
      tests: '++id, name, createdAt',
      questions: '++id, sourceTestId, difficulty, *tags, sectionName',
      attempts: '++id, testId, startTime, status, mode',
      bookmarks: '++id, questionId, folder',
      settings: '++id',
    });
  }
}

export const db = new MCQDatabase();

// Initialize default settings
db.on('populate', () => {
  db.settings.add({
    theme: 'system',
    fullScreenExam: false,
    randomizeQuestions: false,
    randomizeOptions: false,
    showTimerWarnings: true,
  });
});

export default db;
