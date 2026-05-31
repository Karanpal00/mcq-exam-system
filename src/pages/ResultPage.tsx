import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptRepo, questionRepo, testRepo } from '../db/repository';
import { getSectionAnalytics, formatTime, formatDate } from '../utils/analytics';
import type { Attempt, Question, Test } from '../types';
import {
  CheckCircle, XCircle, MinusCircle, Clock,
  RotateCcw, ArrowLeft, ChevronDown, ChevronUp, Flag
} from 'lucide-react';

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [test, setTest] = useState<Test | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'sections'>('overview');
  const [expandedQ, setExpandedQ] = useState<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      if (!attemptId) return;
      const a = await attemptRepo.getById(+attemptId);
      if (!a) { navigate('/'); return; }
      setAttempt(a);

      const [t, qs] = await Promise.all([
        testRepo.getById(a.testId),
        a.testId === 0 ? questionRepo.getByIds(a.answers.map(answer => answer.questionId)) : questionRepo.getByTestId(a.testId),
      ]);
      setTest(t || buildFallbackTest(a));
      setQuestions(qs);
    })();
  }, [attemptId]);

  if (!attempt || !test) return <div className="empty-state"><h3>Loading results...</h3></div>;

  const isPassed = attempt.score >= test.passingMarks;
  const questionMap = new Map(questions.map(q => [q.id!, q]));
  const sectionNames = [...new Set(questions.map(q => q.sectionName || 'General'))];
  const sectionAnalytics = getSectionAnalytics(attempt, questions, sectionNames);

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div>
      {/* Hero */}
      <div className="result-hero">
        <div className="text-sm text-muted mb-1">{attempt.testName}</div>
        <div className="result-score">{attempt.percentage.toFixed(1)}%</div>
        <div className={`result-status ${isPassed ? 'pass' : 'fail'}`}>
          {isPassed ? '✅ PASSED' : '❌ FAILED'}
        </div>
        <div className="text-sm text-muted mt-1">
          Score: {attempt.score}/{attempt.totalMarks} • {formatDate(attempt.startTime)}
        </div>

        <div className="result-grid mt-2">
          <div className="result-stat">
            <div className="result-stat-value" style={{ color: 'var(--text)' }}>{attempt.totalQuestions}</div>
            <div className="result-stat-label">Total</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-value" style={{ color: 'var(--success)' }}>{attempt.correct}</div>
            <div className="result-stat-label">Correct</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-value" style={{ color: 'var(--danger)' }}>{attempt.wrong}</div>
            <div className="result-stat-label">Wrong</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-value" style={{ color: 'var(--text-muted)' }}>{attempt.notAnswered}</div>
            <div className="result-stat-label">Unanswered</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-value">{attempt.totalQuestions - attempt.notAnswered}</div>
            <div className="result-stat-label">Attempted</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-value">{formatTime(attempt.durationUsed || 0)}</div>
            <div className="result-stat-label">Time Used</div>
          </div>
        </div>

        {/* Accuracy bar */}
        <div className="mt-2" style={{ maxWidth: 400, margin: '1rem auto 0' }}>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Accuracy</span>
            <span>{attempt.correct}/{attempt.totalQuestions - attempt.notAnswered} ({((attempt.correct / Math.max(1, attempt.totalQuestions - attempt.notAnswered)) * 100).toFixed(0)}%)</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(attempt.correct / Math.max(1, attempt.totalQuestions)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-sm mb-2" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <button className="btn btn-primary" onClick={() => navigate(attempt.testId === 0 ? '/practice' : `/exam/${attempt.testId}`)}>
          <RotateCcw size={16} /> Retake Full Test
        </button>
        {attempt.wrong > 0 && attempt.testId !== 0 && (
          <button className="btn btn-danger" onClick={() => navigate(`/exam/${attempt.testId}?retake=wrong&attemptId=${attempt.id}`)}>
            <XCircle size={16} /> Retake Wrong ({attempt.wrong})
          </button>
        )}
        {attempt.notAnswered > 0 && attempt.testId !== 0 && (
          <button className="btn btn-ghost" onClick={() => navigate(`/exam/${attempt.testId}?retake=unanswered&attemptId=${attempt.id}`)}>
            <MinusCircle size={16} /> Retake Unanswered ({attempt.notAnswered})
          </button>
        )}
        {attempt.answers.some(a => a.isMarked) && attempt.testId !== 0 && (
          <button className="btn btn-ghost" onClick={() => navigate(`/exam/${attempt.testId}?retake=marked&attemptId=${attempt.id}`)}>
            <Flag size={16} /> Retake Marked
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>Question Review</button>
        <button className={`tab ${activeTab === 'sections' ? 'active' : ''}`} onClick={() => setActiveTab('sections')}>Section Analysis</button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-title mb-2">Performance Summary</div>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr><td className="font-semibold">Test Name</td><td>{attempt.testName}</td></tr>
                <tr><td className="font-semibold">Mode</td><td className="badge badge-info" style={{ textTransform: 'capitalize' }}>{attempt.mode}</td></tr>
                <tr><td className="font-semibold">Start Time</td><td>{formatDate(attempt.startTime)}</td></tr>
                <tr><td className="font-semibold">End Time</td><td>{attempt.endTime ? formatDate(attempt.endTime) : '-'}</td></tr>
                <tr><td className="font-semibold">Duration Used</td><td>{formatTime(attempt.durationUsed || 0)}</td></tr>
                <tr><td className="font-semibold">Status</td><td><span className={`badge ${attempt.status === 'timed-out' ? 'badge-warning' : 'badge-success'}`}>{attempt.status}</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div>
          {attempt.answers.map((answer, idx) => {
            const question = questionMap.get(answer.questionId);
            if (!question) return null;
            const status = answer.selectedAnswer === null ? 'unanswered' : answer.isCorrect ? 'correct' : 'wrong';
            const isExpanded = expandedQ.has(idx);

            return (
              <div key={idx} className={`review-card ${status}`}>
                <div className="review-header" style={{ cursor: 'pointer' }} onClick={() => {
                  const next = new Set(expandedQ);
                  if (isExpanded) next.delete(idx);
                  else next.add(idx);
                  setExpandedQ(next);
                }}>
                  <div className="flex items-center gap-sm">
                    {status === 'correct' && <CheckCircle size={18} style={{ color: 'var(--success)' }} />}
                    {status === 'wrong' && <XCircle size={18} style={{ color: 'var(--danger)' }} />}
                    {status === 'unanswered' && <MinusCircle size={18} style={{ color: 'var(--text-muted)' }} />}
                    <span className="font-semibold text-sm">Q{idx + 1}</span>
                    <span className={`badge ${status === 'correct' ? 'badge-success' : status === 'wrong' ? 'badge-danger' : 'badge-muted'}`}>
                      {status}
                    </span>
                    {answer.timeSpent > 0 && <span className="text-xs text-muted"><Clock size={12} /> {Math.round(answer.timeSpent)}s</span>}
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {isExpanded && (
                  <div className="mt-1">
                    <div className="text-sm" style={{ lineHeight: 1.6 }}>{question.text}</div>
                    <div className="option-list mt-1" style={{ gap: '0.4rem' }}>
                      {question.options.map((opt, oi) => {
                        const isSelected = answer.selectedAnswer === oi;
                        const isCorrectOpt = oi === question.correctAnswer;
                        let cls = 'option-item';
                        if (isCorrectOpt) cls += ' correct';
                        else if (isSelected) cls += ' wrong';

                        return (
                          <div key={oi} className={cls} style={{ padding: '0.6rem 1rem', cursor: 'default' }}>
                            <div className="option-letter" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                              {optionLetters[oi]}
                            </div>
                            <div className="option-text text-sm">{opt}</div>
                            {isSelected && <span className="text-xs font-semibold" style={{ marginLeft: 'auto' }}>Your Answer</span>}
                            {isCorrectOpt && <span className="text-xs font-semibold" style={{ marginLeft: 'auto', color: 'var(--success)' }}>Correct</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sections Tab */}
      {activeTab === 'sections' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Section</th><th>Total</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {sectionAnalytics.map(sa => (
                <tr key={sa.sectionName}>
                  <td className="font-semibold">{sa.sectionName}</td>
                  <td>{sa.totalQuestions}</td>
                  <td>{sa.attempted}</td>
                  <td style={{ color: 'var(--success)' }}>{sa.correct}</td>
                  <td style={{ color: 'var(--danger)' }}>{sa.wrong}</td>
                  <td>
                    <div className="flex items-center gap-sm">
                      <div className="progress-bar" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ width: `${sa.accuracy}%` }} />
                      </div>
                      <span className="text-sm">{sa.accuracy.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>{sa.avgTimePerQuestion.toFixed(0)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function buildFallbackTest(attempt: Attempt): Test {
  return {
    id: attempt.testId,
    name: attempt.testName,
    description: '',
    duration: attempt.duration,
    totalMarks: attempt.totalMarks,
    passingMarks: Math.ceil(attempt.totalMarks * 0.4),
    correctMark: 1,
    wrongMark: 0,
    unansweredMark: 0,
    sections: [{
      id: 'practice',
      name: 'Practice',
      order: 0,
      questionIds: attempt.answers.map(answer => answer.questionId),
    }],
    createdAt: attempt.startTime,
    updatedAt: attempt.endTime || attempt.startTime,
  };
}
