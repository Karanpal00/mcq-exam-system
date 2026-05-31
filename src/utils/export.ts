import type { Question, Test } from '../types';
import { exportToText } from './parser';

export function downloadTextFile(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildTestTextExport(test: Test, questions: Question[]) {
  const sections = test.sections.map(section => ({
    name: section.name,
    questions: questions.filter(q => section.questionIds.includes(q.id!)).map(q => ({
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
    })),
  }));

  return exportToText(test.name, sections);
}

export function buildTestJsonExport(test: Test, questions: Question[]) {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    test,
    questions,
  }, null, 2);
}

export function safeFilename(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mcq-export';
}
