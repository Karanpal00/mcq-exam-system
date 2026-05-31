import db from './database';
import type { Test, Question, Attempt, Bookmark, AppSettings, DashboardStats } from '../types';

// ===== Test Repository =====
export const testRepo = {
  async getAll(): Promise<Test[]> {
    return db.tests.orderBy('createdAt').reverse().toArray();
  },

  async getById(id: number): Promise<Test | undefined> {
    return db.tests.get(id);
  },

  async create(test: Omit<Test, 'id'>): Promise<number> {
    return db.tests.add(test as Test);
  },

  async update(id: number, changes: Partial<Test>): Promise<void> {
    await db.tests.update(id, { ...changes, updatedAt: new Date().toISOString() });
  },

  async delete(id: number): Promise<void> {
    await db.transaction('rw', [db.tests, db.questions, db.attempts, db.bookmarks], async () => {
      const questions = await db.questions.where('sourceTestId').equals(id).toArray();
      const questionIds = questions.map(q => q.id!);
      
      // Delete related bookmarks
      await db.bookmarks.where('questionId').anyOf(questionIds).delete();
      
      // Delete related attempts
      await db.attempts.where('testId').equals(id).delete();
      
      // Delete questions
      await db.questions.where('sourceTestId').equals(id).delete();
      
      // Delete test
      await db.tests.delete(id);
    });
  },

  async getTestWithQuestions(id: number): Promise<{ test: Test; questions: Question[] } | undefined> {
    const test = await db.tests.get(id);
    if (!test) return undefined;
    const questions = await db.questions.where('sourceTestId').equals(id).toArray();
    return { test, questions };
  },
};

// ===== Question Repository =====
export const questionRepo = {
  async getAll(): Promise<Question[]> {
    return db.questions.toArray();
  },

  async getById(id: number): Promise<Question | undefined> {
    return db.questions.get(id);
  },

  async getByIds(ids: number[]): Promise<Question[]> {
    return db.questions.where('id').anyOf(ids).toArray();
  },

  async getByTestId(testId: number): Promise<Question[]> {
    return db.questions.where('sourceTestId').equals(testId).toArray();
  },

  async bulkAdd(questions: Omit<Question, 'id'>[]): Promise<number[]> {
    const ids = await db.questions.bulkAdd(questions as Question[], { allKeys: true });
    return ids as number[];
  },

  async update(id: number, changes: Partial<Question>): Promise<void> {
    await db.questions.update(id, changes);
  },

  async delete(id: number): Promise<void> {
    await db.bookmarks.where('questionId').equals(id).delete();
    await db.questions.delete(id);
  },

  async search(query: string): Promise<Question[]> {
    const lowerQuery = query.toLowerCase();
    return db.questions.filter(q =>
      q.text.toLowerCase().includes(lowerQuery) ||
      q.tags.some(t => t.toLowerCase().includes(lowerQuery))
    ).toArray();
  },

  async getByDifficulty(difficulty: string): Promise<Question[]> {
    return db.questions.where('difficulty').equals(difficulty).toArray();
  },

  async getByTag(tag: string): Promise<Question[]> {
    return db.questions.where('tags').equals(tag).toArray();
  },

  async getAllTags(): Promise<string[]> {
    const questions = await db.questions.toArray();
    const tagSet = new Set<string>();
    questions.forEach(q => q.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  },

  async getCount(): Promise<number> {
    return db.questions.count();
  },

  async getRandom(count: number, excludeIds: number[] = []): Promise<Question[]> {
    const all = await db.questions.toArray();
    const filtered = all.filter(q => !excludeIds.includes(q.id!));
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },
};

// ===== Attempt Repository =====
export const attemptRepo = {
  async getAll(): Promise<Attempt[]> {
    return db.attempts.orderBy('startTime').reverse().toArray();
  },

  async getById(id: number): Promise<Attempt | undefined> {
    return db.attempts.get(id);
  },

  async getByTestId(testId: number): Promise<Attempt[]> {
    const attempts = await db.attempts.where('testId').equals(testId).toArray();
    return attempts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  async create(attempt: Omit<Attempt, 'id'>): Promise<number> {
    return db.attempts.add(attempt as Attempt);
  },

  async update(id: number, changes: Partial<Attempt>): Promise<void> {
    await db.attempts.update(id, changes);
  },

  async delete(id: number): Promise<void> {
    await db.attempts.delete(id);
  },

  async getInProgress(): Promise<Attempt | undefined> {
    return db.attempts.where('status').equals('in-progress').first();
  },

  async getLatest(testId: number): Promise<Attempt | undefined> {
    const attempts = await db.attempts.where('testId').equals(testId).toArray();
    return attempts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
  },

  async getCount(): Promise<number> {
    return db.attempts.count();
  },

  async getWrongQuestionIds(attemptId: number): Promise<number[]> {
    const attempt = await db.attempts.get(attemptId);
    if (!attempt) return [];
    return attempt.answers
      .filter(a => a.selectedAnswer !== null && !a.isCorrect)
      .map(a => a.questionId);
  },

  async getUnansweredQuestionIds(attemptId: number): Promise<number[]> {
    const attempt = await db.attempts.get(attemptId);
    if (!attempt) return [];
    return attempt.answers
      .filter(a => a.selectedAnswer === null)
      .map(a => a.questionId);
  },

  async getMarkedQuestionIds(attemptId: number): Promise<number[]> {
    const attempt = await db.attempts.get(attemptId);
    if (!attempt) return [];
    return attempt.answers
      .filter(a => a.isMarked)
      .map(a => a.questionId);
  },
};

// ===== Bookmark Repository =====
export const bookmarkRepo = {
  async getAll(): Promise<Bookmark[]> {
    return db.bookmarks.toArray();
  },

  async getByFolder(folder: string): Promise<Bookmark[]> {
    return db.bookmarks.where('folder').equals(folder).toArray();
  },

  async add(bookmark: Omit<Bookmark, 'id'>): Promise<number> {
    const existing = await db.bookmarks
      .where('questionId')
      .equals(bookmark.questionId)
      .filter(b => b.folder === bookmark.folder)
      .first();
    if (existing?.id) return existing.id;
    return db.bookmarks.add(bookmark as Bookmark);
  },

  async remove(questionId: number, folder?: string): Promise<void> {
    if (folder) {
      await db.bookmarks.where({ questionId, folder }).delete();
    } else {
      await db.bookmarks.where('questionId').equals(questionId).delete();
    }
  },

  async isBookmarked(questionId: number): Promise<boolean> {
    const count = await db.bookmarks.where('questionId').equals(questionId).count();
    return count > 0;
  },

  async getFolders(): Promise<string[]> {
    const bookmarks = await db.bookmarks.toArray();
    return [...new Set(bookmarks.map(b => b.folder))].sort();
  },
};

// ===== Settings Repository =====
export const settingsRepo = {
  async get(): Promise<AppSettings> {
    const settings = await db.settings.toCollection().first();
    return settings || {
      theme: 'system',
      fullScreenExam: false,
      randomizeQuestions: false,
      randomizeOptions: false,
      showTimerWarnings: true,
    };
  },

  async update(changes: Partial<AppSettings>): Promise<void> {
    const settings = await db.settings.toCollection().first();
    if (settings?.id) {
      await db.settings.update(settings.id, changes);
    } else {
      await db.settings.add(changes as AppSettings);
    }
  },
};

// ===== Dashboard Stats =====
export const statsRepo = {
  async getDashboardStats(): Promise<DashboardStats> {
    const [tests, questions, attempts] = await Promise.all([
      db.tests.count(),
      db.questions.count(),
      db.attempts.where('status').anyOf(['completed', 'auto-submitted', 'timed-out']).toArray(),
    ]);

    const scores = attempts.map(a => a.percentage);
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Calculate streak (consecutive days with attempts)
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
          // Today might not have an attempt yet, check yesterday
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      totalTests: tests,
      totalQuestions: questions,
      totalAttempts: attempts.length,
      bestScore: Math.round(bestScore * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      currentStreak: streak,
    };
  },
};

// ===== Backup & Restore =====
export const backupRepo = {
  async exportAll(): Promise<string> {
    const [tests, questions, attempts, bookmarks, settings] = await Promise.all([
      db.tests.toArray(),
      db.questions.toArray(),
      db.attempts.toArray(),
      db.bookmarks.toArray(),
      db.settings.toArray(),
    ]);

    return JSON.stringify({
      version: 1,
      exportDate: new Date().toISOString(),
      data: { tests, questions, attempts, bookmarks, settings },
    }, null, 2);
  },

  async importAll(jsonStr: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.version || !data.data) {
        return { success: false, error: 'Invalid backup format' };
      }

      await db.transaction('rw', [db.tests, db.questions, db.attempts, db.bookmarks, db.settings], async () => {
        await db.tests.clear();
        await db.questions.clear();
        await db.attempts.clear();
        await db.bookmarks.clear();
        await db.settings.clear();

        if (data.data.tests?.length) await db.tests.bulkAdd(data.data.tests);
        if (data.data.questions?.length) await db.questions.bulkAdd(data.data.questions);
        if (data.data.attempts?.length) await db.attempts.bulkAdd(data.data.attempts);
        if (data.data.bookmarks?.length) await db.bookmarks.bulkAdd(data.data.bookmarks);
        if (data.data.settings?.length) await db.settings.bulkAdd(data.data.settings);
      });

      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  },
};
