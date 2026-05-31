import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import { extractPdfTextBestEffort, parseAnswerKey, parseQuestionText } from '../utils/parser';
import { testRepo, questionRepo } from '../db/repository';
import { useToastStore } from '../components/Common/Toast';
import type { ImportResult, Section } from '../types';

export default function CreateTestPage() {
  const navigate = useNavigate();
  const addToast = useToastStore(s => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [totalMarks, setTotalMarks] = useState(0);
  const [passingMarks, setPassingMarks] = useState(0);
  const [correctMark, setCorrectMark] = useState(1);
  const [wrongMark, setWrongMark] = useState(0);
  const [unansweredMark, setUnansweredMark] = useState(0);

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState<'form' | 'import' | 'preview'>('form');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [answerKeyIssues, setAnswerKeyIssues] = useState(0);

  const handleFileUpload = async (file: File) => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const text = await extractPdfTextBestEffort(file);
        if (!text) {
          addToast('Could not extract text from this PDF. Paste copied text instead.', 'error');
          return;
        }
        setRawText(text);
        parseAndPreview(text);
        addToast('PDF text extracted. Check the preview before saving.', 'info');
      } catch (err) {
        addToast('PDF import failed: ' + (err as Error).message, 'error');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      parseAndPreview(text);
    };
    reader.readAsText(file);
  };

  const parseAndPreview = (text: string) => {
    const result = parseQuestionText(text);
    setImportResult(result);
    if (result.sections.length > 0 && !name) {
      // Auto-set total marks
      setTotalMarks(result.questions.length * correctMark);
      setPassingMarks(Math.floor(result.questions.length * correctMark * 0.4));
    }
    setStep('preview');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.txt') || file.name.endsWith('.pdf') || file.type === 'text/plain' || file.type === 'application/pdf')) {
      handleFileUpload(file);
    }
  }, []);

  const applyAnswerKey = () => {
    if (!importResult) {
      addToast('Parse questions before applying an answer key', 'error');
      return;
    }

    const parsed = parseAnswerKey(answerKeyText);
    const questions = importResult.questions.map((question, index) => {
      const answer = parsed.answers.get(index + 1);
      return answer === undefined ? question : { ...question, correctAnswer: answer };
    });

    setImportResult({
      ...importResult,
      questions,
      warnings: [...importResult.warnings, `Applied ${parsed.answers.size} answer key entries.`],
    });
    setAnswerKeyIssues(parsed.errors.length);
    addToast(`Applied ${parsed.answers.size} answer key entries`, parsed.errors.length ? 'info' : 'success');
  };

  const handleSave = async () => {
    if (!name.trim()) { addToast('Test name is required', 'error'); return; }
    if (!importResult || importResult.questions.length === 0) {
      addToast('Import questions first', 'error'); return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();

      const savedQuestions = await questionRepo.bulkAdd(
        importResult.questions.map(q => ({
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: 'medium' as const,
          tags: [q.sectionName],
          sectionName: q.sectionName,
          createdAt: now,
        }))
      );

      // Build sections with question IDs
      const sectionMap: Record<string, number[]> = {};
      importResult.questions.forEach((q, idx) => {
        if (!sectionMap[q.sectionName]) sectionMap[q.sectionName] = [];
        sectionMap[q.sectionName].push(savedQuestions[idx]);
      });

      const sections: Section[] = Object.entries(sectionMap).map(([sectionName, qIds], idx) => ({
        id: `sec_${Date.now()}_${idx}`,
        name: sectionName,
        order: idx,
        questionIds: qIds,
      }));

      const computedTotal = totalMarks || importResult.questions.length * correctMark;

      // Create test
      const testId = await testRepo.create({
        name: name.trim(),
        description: description.trim(),
        duration,
        totalMarks: computedTotal,
        passingMarks: passingMarks || Math.floor(computedTotal * 0.4),
        correctMark,
        wrongMark: -Math.abs(wrongMark),
        unansweredMark,
        sections,
        createdAt: now,
        updatedAt: now,
      });

      // Update questions with sourceTestId
      for (const qId of savedQuestions) {
        await questionRepo.update(qId, { sourceTestId: testId });
      }

      addToast(`Test "${name}" created with ${importResult.questions.length} questions!`, 'success');
      navigate('/');
    } catch (err) {
      addToast('Failed to save test: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Progress Steps */}
      <div className="flex items-center gap-md mb-2" style={{ justifyContent: 'center' }}>
        {['Test Details', 'Import Questions', 'Preview & Save'].map((label, idx) => {
          const stepKey = ['form', 'import', 'preview'][idx];
          const isActive = step === stepKey;
          const isDone = (step === 'import' && idx === 0) || (step === 'preview' && idx <= 1);
          return (
            <div key={label} className="flex items-center gap-sm" style={{ cursor: 'pointer' }} onClick={() => {
              if (idx === 0) setStep('form');
              else if (idx === 1) setStep('import');
              else if (importResult) setStep('preview');
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--bg-input)',
                color: isActive || isDone ? 'white' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem',
              }}>
                {isDone ? <CheckCircle size={16} /> : idx + 1}
              </div>
              <span className={`text-sm ${isActive ? 'font-bold' : 'text-muted'}`}>{label}</span>
              {idx < 2 && <div style={{ width: 40, height: 2, background: isDone ? 'var(--success)' : 'var(--border)' }} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Form */}
      {step === 'form' && (
        <div className="card mt-2">
          <div className="card-title mb-2">Test Details</div>
          <div className="form-group">
            <label className="form-label">Test Name *</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CIL MT Aptitude Mock Test" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the test" style={{ minHeight: 80 }} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input className="form-input" type="number" value={duration} onChange={e => setDuration(+e.target.value)} min={1} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Marks</label>
              <input className="form-input" type="number" value={totalMarks} onChange={e => setTotalMarks(+e.target.value)} min={0} />
              <div className="form-hint">Leave 0 to auto-calculate from questions</div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Passing Marks</label>
              <input className="form-input" type="number" value={passingMarks} onChange={e => setPassingMarks(+e.target.value)} min={0} />
              <div className="form-hint">Leave 0 for 40% default</div>
            </div>
            <div className="form-group">
              <label className="form-label">Marks per Correct Answer</label>
              <input className="form-input" type="number" value={correctMark} onChange={e => setCorrectMark(+e.target.value)} min={0} step={0.25} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Negative Marking (per wrong answer)</label>
              <input className="form-input" type="number" value={wrongMark} onChange={e => setWrongMark(+e.target.value)} min={0} step={0.25} />
              <div className="form-hint">Enter positive number (e.g. 0.25 for -0.25)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Marks for Unanswered</label>
              <input className="form-input" type="number" value={unansweredMark} onChange={e => setUnansweredMark(+e.target.value)} step={0.25} />
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <button className="btn btn-ghost" onClick={() => navigate('/')}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setStep('import')}>Next: Import Questions →</button>
          </div>
        </div>
      )}

      {/* Step 2: Import */}
      {step === 'import' && (
        <div className="card mt-2">
          <div className="card-title mb-2">Import Questions</div>

          <div
            className={`import-dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h3 className="mb-1">Drop your question file here</h3>
            <p className="text-sm text-muted">or click to browse (.txt or text-based .pdf files)</p>
            <p className="text-xs text-muted mt-1">PDF import works best with copyable PDFs. Scanned PDFs should be pasted after OCR.</p>
          </div>

          <input ref={fileInputRef} type="file" accept=".txt,.pdf,text/plain,application/pdf" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />

          <div className="mt-2">
            <label className="form-label">Or paste questions directly:</label>
            <textarea
              className="form-textarea"
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              style={{ minHeight: 200, fontFamily: 'monospace', fontSize: '0.8rem' }}
              placeholder={`[SECTION] Quantitative Aptitude\n\nQ: What is 2 + 2?\nA. 3\nB. 4\nC. 5\nD. 6\nANSWER: B`}
            />
            <button className="btn btn-primary mt-1" onClick={() => rawText && parseAndPreview(rawText)} disabled={!rawText.trim()}>
              Parse Questions
            </button>
          </div>

          <div className="flex justify-between mt-2">
            <button className="btn btn-ghost" onClick={() => setStep('form')}>← Back</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && importResult && (
        <div className="card mt-2">
          <div className="card-title mb-2">Preview</div>

          {/* Summary */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-icon green"><CheckCircle size={20} /></div>
              <div>
                <div className="stat-value">{importResult.questions.length}</div>
                <div className="stat-label">Questions</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><FileText size={20} /></div>
              <div>
                <div className="stat-value">{importResult.sections.length}</div>
                <div className="stat-label">Sections</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><AlertCircle size={20} /></div>
              <div>
                <div className="stat-value">{importResult.errors.length}</div>
                <div className="stat-label">Errors</div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <div className="mb-2">
              <h4 className="font-semibold mb-1" style={{ color: 'var(--danger)' }}>Errors</h4>
              {importResult.errors.map((err, i) => (
                <div key={i} className="import-error">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>Line {err.line}: {err.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card mb-2" style={{ background: 'var(--bg-input)' }}>
            <div className="card-title flex items-center gap-sm mb-1"><KeyRound size={18} /> Answer Key Import</div>
            <textarea
              className="form-textarea"
              value={answerKeyText}
              onChange={e => setAnswerKeyText(e.target.value)}
              placeholder={'Q1: B\nQ2: C\nQ3: A'}
              style={{ minHeight: 90 }}
            />
            <div className="flex items-center gap-sm mt-1">
              <button className="btn btn-ghost btn-sm" disabled={!answerKeyText.trim()} onClick={applyAnswerKey}>
                Apply Answer Key
              </button>
              {answerKeyIssues > 0 && <span className="text-xs text-muted">{answerKeyIssues} line(s) could not be parsed</span>}
            </div>
          </div>

          {/* Sections */}
          <div className="mb-2">
            <h4 className="font-semibold mb-1">Sections</h4>
            {importResult.sections.map((sec, i) => (
              <div key={i} className="flex items-center justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                <span className="font-semibold">{sec.name}</span>
                <span className="badge badge-info">{sec.questionCount} questions</span>
              </div>
            ))}
          </div>

          {/* Question Preview */}
          <div className="mb-2">
            <h4 className="font-semibold mb-1">Questions Preview</h4>
            <div className="import-preview">
              {importResult.questions.slice(0, 10).map((q, i) => (
                <div key={i} className="review-card" style={{ marginBottom: '0.5rem' }}>
                  <div className="text-xs text-muted mb-1">{q.sectionName} • Line {q.lineNumber}</div>
                  <div className="font-semibold text-sm">{q.text}</div>
                  <div className="mt-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="text-xs" style={{
                        padding: '0.25rem 0.5rem', borderRadius: 4,
                        background: oi === q.correctAnswer ? 'var(--success-light)' : 'var(--bg-input)',
                        color: oi === q.correctAnswer ? 'var(--success)' : 'var(--text-secondary)',
                        fontWeight: oi === q.correctAnswer ? 600 : 400,
                      }}>
                        {String.fromCharCode(65 + oi)}. {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {importResult.questions.length > 10 && (
                <div className="text-center text-sm text-muted" style={{ padding: '1rem' }}>
                  ... and {importResult.questions.length - 10} more questions
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-2">
            <button className="btn btn-ghost" onClick={() => setStep('import')}>← Back to Import</button>
            <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving || !importResult.success}>
              {saving ? 'Saving...' : `Save Test (${importResult.questions.length} questions)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
