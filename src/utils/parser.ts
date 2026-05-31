import type { ImportResult, ImportError, ParsedQuestion, ParsedSection } from '../types';

/**
 * Parse MCQ questions from text format.
 * 
 * Supported format:
 * [SECTION] Section Name
 * 
 * Q: Question text
 * A. Option A
 * B. Option B
 * C. Option C
 * D. Option D
 * ANSWER: B
 */
export function parseQuestionText(text: string): ImportResult {
  const lines = text.split('\n').map(l => l.trimEnd());
  const errors: ImportError[] = [];
  const warnings: string[] = [];
  const sections: ParsedSection[] = [];
  const questions: ParsedQuestion[] = [];

  let currentSection = 'General';
  let i = 0;

  // Track section question counts
  const sectionCounts: Record<string, number> = {};

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // Skip comment lines
    if (line.startsWith('#') || line.startsWith('//')) {
      i++;
      continue;
    }

    // Section header
    if (line.match(/^\[SECTION\]\s*/i)) {
      const sectionName = line.replace(/^\[SECTION\]\s*/i, '').trim();
      if (!sectionName) {
        errors.push({ line: i + 1, message: 'Section name is empty', severity: 'error' });
      } else {
        currentSection = sectionName;
        if (!sectionCounts[currentSection]) {
          sectionCounts[currentSection] = 0;
        }
      }
      i++;
      continue;
    }

    // Question start
    if (line.match(/^Q[:.)]\s*/i) || line.match(/^Q\d+[:.)]\s*/i)) {
      const questionText = line.replace(/^Q\d*[:.)]\s*/i, '').trim();

      if (!questionText) {
        errors.push({ line: i + 1, message: 'Question text is empty', severity: 'error' });
        i++;
        continue;
      }

      // Collect multi-line question text
      let fullQuestionText = questionText;
      let nextLine = i + 1;
      while (nextLine < lines.length) {
        const nl = lines[nextLine].trim();
        if (!nl || nl.match(/^[A-D][:.)]\s*/i) || nl.match(/^ANSWER\s*:/i)) break;
        if (nl.match(/^Q[:.)]\s*/i) || nl.match(/^\[SECTION\]/i)) break;
        fullQuestionText += ' ' + nl;
        nextLine++;
      }
      i = nextLine;

      // Parse options
      const options: string[] = [];
      const optionLetters = ['A', 'B', 'C', 'D'];

      for (let optIdx = 0; optIdx < 4; optIdx++) {
        if (i >= lines.length) {
          errors.push({
            line: i + 1,
            message: `Missing option ${optionLetters[optIdx]} for question starting at line ${i - optIdx}`,
            severity: 'error',
          });
          break;
        }

        const optLine = lines[i].trim();
        const optMatch = optLine.match(new RegExp(`^${optionLetters[optIdx]}[:.)\\s]\\s*(.*)`, 'i'));

        if (!optMatch) {
          // Try to be flexible — maybe option without letter prefix
          const altMatch = optLine.match(/^[A-Da-d][:.)]\s*(.*)/);
          if (altMatch) {
            options.push(altMatch[1].trim());
          } else {
            errors.push({
              line: i + 1,
              message: `Expected option ${optionLetters[optIdx]}, found: "${optLine.substring(0, 40)}"`,
              severity: 'error',
            });
            options.push(optLine);
          }
        } else {
          options.push(optMatch[1].trim());
        }
        i++;
      }

      if (options.length < 4) {
        errors.push({
          line: i + 1,
          message: `Question has only ${options.length} options (need 4)`,
          severity: 'error',
        });
        continue;
      }

      // Parse answer
      let correctAnswer = -1;
      let explanation: string | undefined = undefined;
      if (i < lines.length) {
        const ansLine = lines[i].trim();
        const ansMatch = ansLine.match(/^ANSWER\s*:\s*([A-Da-d])/i);
        if (ansMatch) {
          correctAnswer = ansMatch[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          i++;

          // Parse optional explanation
          if (i < lines.length) {
            const expMatch = lines[i].trim().match(/^EXPLANATION\s*:(.*)/i);
            if (expMatch) {
              explanation = expMatch[1].trim();
              i++;
              while (i < lines.length) {
                const nl = lines[i].trim();
                if (!nl || nl.match(/^Q[:.)]\s*/i) || nl.match(/^\[SECTION\]/i)) break;
                explanation += (explanation ? ' ' : '') + nl;
                i++;
              }
            }
          }
        } else {
          errors.push({
            line: i + 1,
            message: `Expected "ANSWER: X" line, found: "${ansLine.substring(0, 40)}"`,
            severity: 'error',
          });
        }
      } else {
        errors.push({
          line: i,
          message: 'Missing answer for last question',
          severity: 'error',
        });
      }

      if (correctAnswer >= 0 && correctAnswer <= 3) {
        questions.push({
          sectionName: currentSection,
          text: fullQuestionText,
          options,
          correctAnswer,
          explanation,
          lineNumber: i - 4, // Approximate
        });

        if (!sectionCounts[currentSection]) sectionCounts[currentSection] = 0;
        sectionCounts[currentSection]++;
      }

      continue;
    }

    // Unknown line — skip with warning
    if (line.length > 2) {
      warnings.push(`Line ${i + 1}: Skipped unrecognized content: "${line.substring(0, 50)}"`);
    }
    i++;
  }

  // Build sections array
  for (const [name, count] of Object.entries(sectionCounts)) {
    sections.push({ name, questionCount: count });
  }

  return {
    success: errors.filter(e => e.severity === 'error').length === 0,
    sections,
    questions,
    errors,
    warnings,
  };
}

/**
 * Parse an answer key file.
 * Format:
 * Q1: B
 * Q2: C
 * or
 * 1. B
 * 2. C
 */
export function parseAnswerKey(text: string): { answers: Map<number, number>; errors: ImportError[] } {
  const lines = text.split('\n');
  const answers = new Map<number, number>();
  const errors: ImportError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Match patterns like "Q1: B", "1. B", "Q1) B", "1: B", "1 B"
    const match = line.match(/^Q?(\d+)[:.)\s]+\s*([A-Da-d])\s*$/i);
    if (match) {
      const qNum = parseInt(match[1]);
      const answer = match[2].toUpperCase().charCodeAt(0) - 65;
      answers.set(qNum, answer);
    } else {
      errors.push({ line: i + 1, message: `Cannot parse: "${line}"`, severity: 'warning' });
    }
  }

  return { answers, errors };
}

/**
 * Best-effort PDF text extraction for simple, copyable PDFs.
 * It is intentionally dependency-free so the app remains deployable/offline.
 */
export async function extractPdfTextBestEffort(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const raw = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  const textRuns: string[] = [];
  const literalPattern = /\((?:\\.|[^\\)])*\)\s*Tj|\[(.*?)\]\s*TJ/gs;
  let match: RegExpExecArray | null;

  while ((match = literalPattern.exec(raw))) {
    const token = match[0];
    const parts = token.match(/\((?:\\.|[^\\)])*\)/g) || [];
    for (const part of parts) {
      textRuns.push(unescapePdfLiteral(part.slice(1, -1)));
    }
  }

  if (textRuns.length === 0) {
    const fallback = raw
      .replace(/[^\x20-\x7E\n\r\t]+/g, ' ')
      .split(/\s{2,}/)
      .filter(chunk => /Q\d*[:.)]|ANSWER\s*:|^[A-D][.)]/i.test(chunk))
      .join('\n');
    return fallback.trim();
  }

  return textRuns.join(' ').replace(/\s+/g, ' ').trim();
}

function unescapePdfLiteral(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Export test questions to text format.
 */
export function exportToText(
  testName: string,
  sections: { name: string; questions: { text: string; options: string[]; correctAnswer: number; explanation?: string }[] }[]
): string {
  const optionLetters = ['A', 'B', 'C', 'D'];
  let output = `# ${testName}\n\n`;

  for (const section of sections) {
    output += `[SECTION] ${section.name}\n\n`;

    for (let i = 0; i < section.questions.length; i++) {
      const q = section.questions[i];
      output += `Q: ${q.text}\n`;
      q.options.forEach((opt, idx) => {
        output += `${optionLetters[idx]}. ${opt}\n`;
      });
      output += `ANSWER: ${optionLetters[q.correctAnswer]}\n`;
      if (q.explanation) {
        output += `EXPLANATION: ${q.explanation}\n`;
      }
      output += `\n`;
    }
  }

  return output;
}

/**
 * Validate import result before saving
 */
export function validateImport(result: ImportResult): string[] {
  const issues: string[] = [];

  if (result.questions.length === 0) {
    issues.push('No valid questions found in the file');
  }

  if (result.sections.length === 0) {
    issues.push('No sections found — questions will be placed in "General" section');
  }

  // Check for duplicate questions
  const questionTexts = result.questions.map(q => q.text.toLowerCase().trim());
  const dupes = questionTexts.filter((t, i) => questionTexts.indexOf(t) !== i);
  if (dupes.length > 0) {
    issues.push(`${dupes.length} duplicate question(s) detected`);
  }

  // Check for empty options
  for (const q of result.questions) {
    if (q.options.some(o => !o.trim())) {
      issues.push(`Question at line ${q.lineNumber} has empty option(s)`);
    }
  }

  return issues;
}
