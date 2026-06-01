import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useExamStore, loadExamStateFromLS } from '../store/examStore';
import { useTimer } from '../hooks/useTimer';
import { testRepo, questionRepo, attemptRepo } from '../db/repository';
import { formatTime } from '../utils/analytics';
import {
  ChevronLeft, ChevronRight, Flag, Bookmark, X, Send, Clock,
  AlertTriangle, Maximize, Minimize, Grid3X3, ChevronUp, LogOut
} from 'lucide-react';
import Modal from '../components/Common/Modal';
import { useToastStore } from '../components/Common/Toast';
import type { Test } from '../types';

export default function ExamPage() {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToast = useToastStore(s => s.addToast);

  const mode = (searchParams.get('mode') || (testId ? 'exam' : 'practice')) as 'exam' | 'study' | 'practice' | 'smart-retake';
  const retakeType = searchParams.get('retake') || undefined;
  const attemptIdParam = searchParams.get('attemptId');

  const {
    examState, questions, test, startExam, resumeExam,
    selectAnswer, clearAnswer, toggleMark, toggleBookmark,
    navigateToQuestion, submitExam, resetExam, recordTimeSpent, saveProgress
  } = useExamStore();

  const { remainingSeconds, showWarning5min, showWarning1min, isExpired } = useTimer();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const timeTrackRef = useRef<number>(Date.now());
  const timeoutSubmitRef = useRef(false);
  const questionAreaRef = useRef<HTMLDivElement>(null);

  // Initialize exam
  useEffect(() => {
    (async () => {
      const numericTestId = testId ? +testId : 0;

      // Check for in-progress exam
      const savedState = loadExamStateFromLS();
      if (savedState && savedState.testId === numericTestId && savedState.status === 'running') {
        const [t, qs] = await Promise.all([
          numericTestId === 0 ? Promise.resolve(null) : testRepo.getById(numericTestId),
          numericTestId === 0 ? questionRepo.getByIds(savedState.answers.map(a => a.questionId)) : questionRepo.getByTestId(numericTestId),
        ]);
        const resumeTest = t || buildPracticeTest(qs.length, searchParams.get('duration'));
        if (resumeTest && qs.length > 0) {
          const attempt = await attemptRepo.getById(savedState.attemptId!);
          if (attempt) {
            resumeExam(attempt, resumeTest, qs);
            setLoading(false);
            return;
          }
        }
      }

      // Start fresh exam
      let t: Test | undefined = numericTestId === 0 ? undefined : await testRepo.getById(numericTestId);
      if (numericTestId !== 0 && !t) { navigate('/'); return; }

      let qs = numericTestId === 0
        ? await getPracticeQuestions(searchParams)
        : await questionRepo.getByTestId(numericTestId);

      if (numericTestId === 0) {
        t = buildPracticeTest(qs.length, searchParams.get('duration'));
      }

      // Handle smart retake
      if (retakeType && attemptIdParam) {
        const prevAttempt = await attemptRepo.getById(+attemptIdParam);
        if (prevAttempt) {
          let filterIds: number[] = [];
          if (retakeType === 'wrong') {
            filterIds = prevAttempt.answers.filter(a => a.selectedAnswer !== null && !a.isCorrect).map(a => a.questionId);
          } else if (retakeType === 'unanswered') {
            filterIds = prevAttempt.answers.filter(a => a.selectedAnswer === null).map(a => a.questionId);
          } else if (retakeType === 'marked') {
            filterIds = prevAttempt.answers.filter(a => a.isMarked).map(a => a.questionId);
          }
          if (filterIds.length > 0) {
            qs = qs.filter(q => filterIds.includes(q.id!));
          }
        }
      }

      if (qs.length === 0) { addToast('No questions found', 'error'); navigate('/'); return; }

      // Adjust test for filtered questions
      const adjustedTest = { ...t!, totalMarks: qs.length * t!.correctMark };
      await startExam(adjustedTest, qs, mode, retakeType);
      setLoading(false);
    })();

    return () => { resetExam(); };
  }, [testId]);

  // Track time per question
  useEffect(() => {
    if (!examState) return;
    timeTrackRef.current = Date.now();

    return () => {
      const elapsed = (Date.now() - timeTrackRef.current) / 1000;
      if (elapsed > 0.5 && examState) {
        recordTimeSpent(examState.currentQuestionIndex, elapsed);
      }
    };
  }, [examState?.currentQuestionIndex]);

  // Auto-save every 30s
  useEffect(() => {
    if (!examState || examState.status !== 'running') return;
    const interval = setInterval(() => {
      useExamStore.getState().saveProgress();
    }, 30000);
    return () => clearInterval(interval);
  }, [examState?.status]);

  // Warning toasts
  useEffect(() => {
    if (showWarning5min) addToast('⚠️ 5 minutes remaining!', 'info');
  }, [showWarning5min]);

  useEffect(() => {
    if (showWarning1min) addToast('🚨 1 minute remaining!', 'error');
  }, [showWarning1min]);

  useEffect(() => {
    if (!isExpired || !examState || timeoutSubmitRef.current) return;
    timeoutSubmitRef.current = true;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
    submitExam().then(result => {
      if (result) navigate(`/results/${result.id}`);
    });
  }, [isExpired, examState, submitExam, navigate]);

  const handleSubmit = async () => {
    setShowSubmitModal(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
    const result = await submitExam();
    if (result) {
      navigate(`/results/${result.id}`);
    }
  };

  // Automatic full screen when test starts (not in study mode)
  useEffect(() => {
    if (!loading && mode !== 'study' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Silently catch browser security blocks
      });
    }
  }, [loading, mode]);


  // Scroll to top of question area when navigating questions
  useEffect(() => {
    if (questionAreaRef.current) {
      questionAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [examState?.currentQuestionIndex]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => addToast('Full screen was blocked by the browser', 'error'));
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => undefined);
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => setIsFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!examState || showSubmitModal) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (['1', '2', '3', '4'].includes(event.key)) {
        selectAnswer(examState.currentQuestionIndex, Number(event.key) - 1);
      } else if (event.key === 'ArrowLeft') {
        navigateToQuestion(Math.max(0, examState.currentQuestionIndex - 1));
      } else if (event.key === 'ArrowRight') {
        navigateToQuestion(Math.min(examState.answers.length - 1, examState.currentQuestionIndex + 1));
      } else if (event.key.toLowerCase() === 'm' || event.key.toLowerCase() === 'f') {
        toggleMark(examState.currentQuestionIndex);
      } else if (event.key.toLowerCase() === 'b') {
        toggleBookmark(examState.currentQuestionIndex);
      } else if (event.key.toLowerCase() === 'c') {
        clearAnswer(examState.currentQuestionIndex);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [examState, showSubmitModal, selectAnswer, navigateToQuestion, toggleMark, toggleBookmark, clearAnswer]);

  // Swipe detection for mobile navigation (whole main area)
  useEffect(() => {
    const el = document.querySelector('.exam-main');
    if (!el || !examState) return;

    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    const onTouchStart = (e: any) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = true;
    };

    const onTouchMove = (e: any) => {
      if (!isSwiping) return;
      const diffX = e.touches[0].clientX - startX;
      const diffY = e.touches[0].clientY - startY;

      // If moving horizontally, prevent vertical scroll and browser gestures
      if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
        if (e.cancelable) e.preventDefault();
      }
    };

    const onTouchEnd = (e: any) => {
      if (!isSwiping) return;
      isSwiping = false;
      const diffX = e.changedTouches[0].clientX - startX;
      const diffY = e.changedTouches[0].clientY - startY;

      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
        if (diffX > 50) {
          // Swipe right -> Go to Prev
          if (examState.currentQuestionIndex > 0) {
            navigateToQuestion(examState.currentQuestionIndex - 1);
          }
        } else if (diffX < -50) {
          // Swipe left -> Go to Next
          if (examState.currentQuestionIndex < examState.answers.length - 1) {
            navigateToQuestion(examState.currentQuestionIndex + 1);
          }
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [examState?.currentQuestionIndex, examState?.answers.length, navigateToQuestion]);

  const handleSaveExit = async () => {
    await saveProgress();
    setShowExitModal(false);
    navigate('/');
  };

  const handleDiscardExit = async () => {
    if (examState?.attemptId) {
      await attemptRepo.delete(examState.attemptId);
    }
    resetExam();
    setShowExitModal(false);
    navigate('/');
  };

  if (loading || !examState || !test || questions.length === 0) {
    return <div className="exam-layout"><div className="exam-main"><div className="empty-state"><h3>Loading exam...</h3></div></div></div>;
  }

  const currentIdx = examState.currentQuestionIndex;
  const qOrderIdx = examState.questionOrder[currentIdx];
  const currentQuestion = questions[qOrderIdx];
  const currentAnswer = examState.answers[currentIdx];
  const totalQ = examState.answers.length;

  // Section info
  const currentSection = test.sections.find(s =>
    currentQuestion ? s.questionIds.includes(currentQuestion.id!) : false
  );

  const unanswered = examState.answers.filter(a => a.selectedAnswer === null).length;
  const marked = examState.answers.filter(a => a.isMarked).length;
  const answered = examState.answers.filter(a => a.selectedAnswer !== null).length;

  const getQuestionStatus = (idx: number) => {
    const a = examState.answers[idx];
    if (a.isMarked && a.selectedAnswer !== null) return 'marked';
    if (a.isMarked) return 'marked';
    if (a.selectedAnswer !== null) return 'answered';
    if (idx <= currentIdx) return 'visited';
    return 'not-visited';
  };

  const timerClass = showWarning1min ? 'danger' : showWarning5min ? 'warning' : '';

  // Progress percentage
  const progressPct = ((answered / totalQ) * 100).toFixed(0);

  return (
    <div className="exam-layout">
      <div className="exam-main">
        {/* Header */}
        <div className="exam-header">
          <div className="exam-header-left">
            <div className="font-bold truncate">{test.name}</div>
            <div className="text-xs text-muted truncate">
              {currentSection?.name && <span className="desktop-only">{currentSection.name} • </span>}
              Q {currentIdx + 1}/{totalQ}
              {mode === 'study' && <span className="badge badge-info" style={{ marginLeft: 8 }}>Study</span>}
            </div>
          </div>
          <div className="exam-header-right">
            {mode !== 'study' && (
              <div className={`exam-timer ${timerClass}`}>
                <Clock size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {formatTime(remainingSeconds)}
              </div>
            )}
            {/* Mobile palette toggle */}
            <button
              className="btn-icon exam-palette-toggle"
              onClick={() => setShowMobilePalette(!showMobilePalette)}
              title="Question Palette"
            >
              <Grid3X3 size={18} />
            </button>
            <button className="btn-icon desktop-only" onClick={toggleFullScreen} title="Toggle Fullscreen">
              {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button className="btn btn-primary btn-sm flex items-center gap-sm" onClick={() => setShowSubmitModal(true)} title="Submit Exam">
              <Send size={14} /> <span className="exam-btn-label">Submit</span>
            </button>
            <button className="btn btn-danger btn-sm flex items-center gap-sm" onClick={() => setShowExitModal(true)} title="Exit Exam">
              <LogOut size={14} /> <span className="exam-btn-label">Exit</span>
            </button>
          </div>
        </div>

        {/* Progress bar for mobile */}
        <div className="exam-progress-bar">
          <div className="exam-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Question Area */}
        <div className="exam-question-area" ref={questionAreaRef}>
          <div className="exam-question-card">
            <div className="flex justify-between items-center mb-2" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <div className="exam-question-num">Question {currentIdx + 1}</div>
              <div className="flex items-center gap-sm">
                <button className={`btn btn-sm ${currentAnswer?.isMarked ? 'btn-warning' : 'btn-ghost'}`}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                  onClick={() => toggleMark(currentIdx)} title="Mark for Review">
                  <Flag size={14} /> <span style={{ marginLeft: '4px' }}>Mark</span>
                </button>
                <button className={`btn btn-sm ${currentAnswer?.isBookmarked ? 'btn-warning' : 'btn-ghost'}`}
                  style={{ padding: '0.3rem', borderRadius: '50%' }}
                  onClick={() => toggleBookmark(currentIdx)} title="Bookmark Question">
                  <Bookmark size={14} />
                </button>
                <button className="btn btn-ghost btn-sm"
                  style={{ padding: '0.3rem', borderRadius: '50%' }}
                  onClick={() => clearAnswer(currentIdx)}
                  disabled={currentAnswer?.selectedAnswer === null} title="Clear Selected Answer">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="exam-question-text">{currentQuestion?.text}</div>

            <div className="option-list">
              {currentQuestion?.options.map((opt, idx) => {
                const isSelected = currentAnswer?.selectedAnswer === idx;
                const isStudyMode = mode === 'study';
                const isCorrect = isStudyMode && idx === currentQuestion.correctAnswer;
                const isWrong = isStudyMode && isSelected && idx !== currentQuestion.correctAnswer;

                let className = 'option-item';
                if (isSelected && !isStudyMode) className += ' selected';
                if (isCorrect && isSelected) className += ' correct';
                if (isWrong) className += ' wrong';
                if (isCorrect && currentAnswer?.selectedAnswer !== null) className += ' correct';

                return (
                  <div
                    key={idx}
                    className={className}
                    onClick={() => selectAnswer(currentIdx, idx)}
                  >
                    <div className="option-letter">{String.fromCharCode(65 + idx)}</div>
                    <div className="option-text">{opt}</div>
                  </div>
                );
              })}
            </div>

            {mode === 'study' && currentAnswer?.selectedAnswer !== null && currentQuestion?.explanation && (
              <div className="card mt-2" style={{ background: 'var(--info-light)', borderColor: 'var(--info)' }}>
                <div className="text-sm"><strong>Explanation:</strong> {currentQuestion.explanation}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="exam-footer mobile-only">
          <div className="exam-footer-nav" style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={currentIdx === 0}
              onClick={() => navigateToQuestion(currentIdx - 1)}>
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="exam-footer-counter">{currentIdx + 1} / {totalQ}</span>
            <button className="btn btn-ghost btn-sm" disabled={currentIdx === totalQ - 1}
              onClick={() => navigateToQuestion(currentIdx + 1)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Question Palette Sidebar — Desktop */}
      <div className="exam-sidebar">
        <div className="palette-header">Question Palette</div>

        {test.sections.length > 1 && (
          <div className="palette-sections">
            {test.sections.map((sec, si) => (
              <button key={sec.id}
                className={`palette-section-btn ${si === examState.currentSectionIndex ? 'active' : ''}`}
                onClick={() => {
                  const firstQId = sec.questionIds[0];
                  const idx = examState.questionOrder.findIndex(qi => questions[qi]?.id === firstQId);
                  if (idx >= 0) navigateToQuestion(idx);
                }}
              >
                {sec.name}
              </button>
            ))}
          </div>
        )}

        <div className="palette-grid">
          {Array.from({ length: totalQ }, (_, i) => {
            const status = getQuestionStatus(i);
            return (
              <button key={i}
                className={`palette-btn ${status} ${i === currentIdx ? 'current' : ''}`}
                onClick={() => navigateToQuestion(i)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Desktop Navigation below Palette Grid */}
        <div className="palette-navigation">
          <button className="btn btn-ghost btn-sm" disabled={currentIdx === 0}
            onClick={() => navigateToQuestion(currentIdx - 1)}>
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="palette-counter">{currentIdx + 1} / {totalQ}</span>
          <button className="btn btn-ghost btn-sm" disabled={currentIdx === totalQ - 1}
            onClick={() => navigateToQuestion(currentIdx + 1)}>
            Next <ChevronRight size={16} />
          </button>
        </div>

        <div className="palette-stats">
          <div className="palette-stat-item"><span className="palette-stat-dot answered" /> {answered} Answered</div>
          <div className="palette-stat-item"><span className="palette-stat-dot marked" /> {marked} Marked</div>
          <div className="palette-stat-item"><span className="palette-stat-dot visited" /> {unanswered} Left</div>
        </div>

        <div className="palette-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--bg-input)' }} /> Not Visited</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--danger-light)' }} /> Visited</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--success)' }} /> Answered</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent)' }} /> Marked</div>
        </div>
      </div>

      {/* Mobile Question Palette Sheet */}
      {showMobilePalette && (
        <div className="exam-mobile-palette-overlay" onClick={() => setShowMobilePalette(false)}>
          <div className="exam-mobile-palette" onClick={e => e.stopPropagation()}>
            <div className="exam-mobile-palette-header">
              <span className="font-bold">Question Palette</span>
              <button className="btn-icon" onClick={() => setShowMobilePalette(false)}>
                <ChevronUp size={18} />
              </button>
            </div>

            <div className="palette-stats" style={{ borderTop: 'none' }}>
              <div className="palette-stat-item"><span className="palette-stat-dot answered" /> {answered}</div>
              <div className="palette-stat-item"><span className="palette-stat-dot marked" /> {marked}</div>
              <div className="palette-stat-item"><span className="palette-stat-dot visited" /> {unanswered}</div>
            </div>

            <div className="palette-grid" style={{ maxHeight: '50vh' }}>
              {Array.from({ length: totalQ }, (_, i) => {
                const status = getQuestionStatus(i);
                return (
                  <button key={i}
                    className={`palette-btn ${status} ${i === currentIdx ? 'current' : ''}`}
                    onClick={() => { navigateToQuestion(i); setShowMobilePalette(false); }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Exam?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowSubmitModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Submit</button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <AlertTriangle size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
          <p>You still have:</p>
          <div className="stats-grid mt-1" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="stat-card" style={{ justifyContent: 'center', textAlign: 'center' }}>
              <div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{unanswered}</div><div className="stat-label">Unanswered</div></div>
            </div>
            <div className="stat-card" style={{ justifyContent: 'center', textAlign: 'center' }}>
              <div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{marked}</div><div className="stat-label">Marked</div></div>
            </div>
            <div className="stat-card" style={{ justifyContent: 'center', textAlign: 'center' }}>
              <div><div className="stat-value" style={{ fontSize: '1.25rem' }}>{answered}</div><div className="stat-label">Answered</div></div>
            </div>
          </div>
          {mode !== 'study' && (
            <p className="text-sm text-muted mt-1">
              Time remaining: <strong>{formatTime(remainingSeconds)}</strong>
            </p>
          )}
          <p className="text-sm text-muted mt-2">Are you sure you want to submit?</p>
        </div>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal
        open={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Exit Test?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowExitModal(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDiscardExit}>Discard & Exit</button>
            <button className="btn btn-primary" onClick={handleSaveExit}>Save & Exit</button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <AlertTriangle size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
          <p className="font-semibold" style={{ fontSize: '1.1rem' }}>How would you like to exit?</p>
          <div style={{ textAlign: 'left', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
              <strong style={{ color: 'var(--primary)' }}>Save & Exit</strong>
              <p className="text-xs text-muted mt-1">Saves your current progress. You can resume this exam later from the dashboard.</p>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
              <strong style={{ color: 'var(--danger)' }}>Discard & Exit</strong>
              <p className="text-xs text-muted mt-1">Deletes this attempt completely. You will lose your answers for this attempt.</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function buildPracticeTest(questionCount: number, durationParam: string | null): Test {
  const duration = Math.max(1, Number(durationParam || Math.ceil(questionCount * 1.5)) || 15);
  return {
    id: 0,
    name: 'Practice Set',
    description: 'Random practice from the question bank',
    duration,
    totalMarks: questionCount,
    passingMarks: Math.ceil(questionCount * 0.4),
    correctMark: 1,
    wrongMark: 0,
    unansweredMark: 0,
    sections: [{
      id: 'practice',
      name: 'Practice',
      order: 0,
      questionIds: [],
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function getPracticeQuestions(searchParams: URLSearchParams) {
  const count = Math.max(1, Math.min(200, Number(searchParams.get('count') || 20)));
  const difficulty = searchParams.get('difficulty') || 'all';
  const tag = searchParams.get('tag') || 'all';
  const all = await questionRepo.getAll();
  const filtered = all.filter(q => {
    const matchesDifficulty = difficulty === 'all' || q.difficulty === difficulty;
    const matchesTag = tag === 'all' || q.tags.includes(tag) || q.sectionName === tag;
    return matchesDifficulty && matchesTag;
  });
  return filtered.sort(() => Math.random() - 0.5).slice(0, count);
}
