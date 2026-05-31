import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testRepo } from '../db/repository';
import type { Test } from '../types';
import { BookOpen, Brain } from 'lucide-react';

export default function StudyModePage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    testRepo.getAll().then(t => { setTests(t); setLoading(false); });
  }, []);

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  return (
    <div>
      <div className="card mb-2">
        <div className="card-header">
          <div>
            <div className="card-title flex items-center gap-sm"><Brain size={20} /> Study Mode</div>
            <div className="card-subtitle">Learn at your own pace — see answers instantly, no timer, no scoring</div>
          </div>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <h3>No tests available</h3>
          <p className="text-sm text-muted">Create a test first to use study mode</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {tests.map(test => {
            const qCount = test.sections.reduce((s, sec) => s + sec.questionIds.length, 0);
            return (
              <div key={test.id} className="card" style={{ cursor: 'pointer' }}>
                <div className="card-title">{test.name}</div>
                <div className="text-sm text-muted mb-2">{qCount} questions • {test.sections.length} sections</div>
                <div className="flex gap-sm">
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/exam/${test.id}?mode=study`)}>
                    <BookOpen size={14} /> Study
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tests/${test.id}`)}>
                    View Questions
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
