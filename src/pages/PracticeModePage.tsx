import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionRepo } from '../db/repository';
import type { Question } from '../types';
import { Brain, Shuffle, Target } from 'lucide-react';

export default function PracticeModePage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [count, setCount] = useState(20);
  const [duration, setDuration] = useState(30);
  const [difficulty, setDifficulty] = useState('all');
  const [tag, setTag] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [allQuestions, allTags] = await Promise.all([
        questionRepo.getAll(),
        questionRepo.getAllTags(),
      ]);
      setQuestions(allQuestions);
      setTags(allTags);
      setLoading(false);
    })();
  }, []);

  const availableCount = useMemo(() => questions.filter(q => {
    const matchesDifficulty = difficulty === 'all' || q.difficulty === difficulty;
    const matchesTag = tag === 'all' || q.tags.includes(tag) || q.sectionName === tag;
    return matchesDifficulty && matchesTag;
  }).length, [questions, difficulty, tag]);

  const startPractice = () => {
    const params = new URLSearchParams({
      mode: 'practice',
      count: String(Math.min(count, availableCount)),
      duration: String(duration),
      difficulty,
      tag,
    });
    navigate(`/practice/exam?${params.toString()}`);
  };

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  if (questions.length === 0) {
    return (
      <div className="empty-state">
        <Target size={48} />
        <h3>No questions available</h3>
        <p className="text-sm text-muted">Create a test first, then practice from the question bank.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="card mb-2">
        <div className="card-header">
          <div>
            <div className="card-title flex items-center gap-sm"><Brain size={20} /> Practice Mode</div>
            <div className="card-subtitle">Build a random set from the full question bank.</div>
          </div>
          <div className="stat-icon purple"><Shuffle size={20} /></div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Questions</label>
            <input className="form-input" type="number" min={1} max={Math.max(1, availableCount)}
              value={count} onChange={e => setCount(Number(e.target.value))} />
            <div className="form-hint">{availableCount} question{availableCount !== 1 ? 's' : ''} match your filters</div>
          </div>
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input className="form-input" type="number" min={1}
              value={duration} onChange={e => setDuration(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <select className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="all">All difficulty levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tag / Section</label>
            <select className="form-select" value={tag} onChange={e => setTag(e.target.value)}>
              <option value="all">All tags</option>
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" disabled={availableCount === 0} onClick={startPractice}>
          <Shuffle size={16} /> Start Random Practice
        </button>
      </div>
    </div>
  );
}
