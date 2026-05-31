import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTestData } from '../hooks/useData';
import { buildTestJsonExport, buildTestTextExport, downloadTextFile, safeFilename } from '../utils/export';
import { Play, Search, BookOpen, Download } from 'lucide-react';

export default function TestViewPage() {
  const { testId } = useParams<{ testId: string }>();
  const { test, questions, attempts, loading } = useTestData(testId ? +testId : undefined);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');

  if (loading || !test) return <div className="empty-state"><h3>Loading...</h3></div>;

  const sections = test.sections;
  const optionLetters = ['A', 'B', 'C', 'D'];
  const filename = safeFilename(test.name);

  const filteredQuestions = questions.filter(q => {
    const matchSearch = !search || q.text.toLowerCase().includes(search.toLowerCase());
    const matchSection = sectionFilter === 'all' || q.sectionName === sectionFilter;
    return matchSearch && matchSection;
  });

  return (
    <div>
      <div className="card mb-2">
        <div className="card-header">
          <div>
            <div className="card-title">{test.name}</div>
            <div className="card-subtitle">{test.description || 'No description'}</div>
          </div>
          <div className="flex gap-sm">
            <button className="btn btn-primary" onClick={() => navigate(`/exam/${test.id}`)}>
              <Play size={16} /> Start Exam
            </button>
            <button className="btn btn-ghost" onClick={() => navigate(`/exam/${test.id}?mode=study`)}>
              <BookOpen size={16} /> Study
            </button>
            <button className="btn btn-ghost" onClick={() => downloadTextFile(`${filename}.txt`, buildTestTextExport(test, questions))}>
              <Download size={16} /> TXT
            </button>
            <button className="btn btn-ghost" onClick={() => downloadTextFile(`${filename}.json`, buildTestJsonExport(test, questions), 'application/json')}>
              <Download size={16} /> JSON
            </button>
          </div>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat-card">
            <div><div className="stat-value">{questions.length}</div><div className="stat-label">Questions</div></div>
          </div>
          <div className="stat-card">
            <div><div className="stat-value">{sections.length}</div><div className="stat-label">Sections</div></div>
          </div>
          <div className="stat-card">
            <div><div className="stat-value">{test.duration}m</div><div className="stat-label">Duration</div></div>
          </div>
          <div className="stat-card">
            <div><div className="stat-value">{attempts.length}</div><div className="stat-label">Attempts</div></div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-sm mb-2" style={{ flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <Search size={18} />
          <input className="form-input" style={{ paddingLeft: '2.5rem' }}
            placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 150 }}
          value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
          <option value="all">All Sections</option>
          {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      {/* Questions List */}
      <div className="text-sm text-muted mb-1">{filteredQuestions.length} questions</div>
      {filteredQuestions.map((q, idx) => (
        <div key={q.id} className="review-card" style={{ marginBottom: '0.75rem' }}>
          <div className="flex items-center gap-sm mb-1">
            <span className="badge badge-muted">Q{idx + 1}</span>
            <span className="badge badge-info">{q.sectionName}</span>
            <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`}>
              {q.difficulty}
            </span>
          </div>
          <div className="font-semibold text-sm" style={{ lineHeight: 1.6 }}>{q.text}</div>
          <div className="mt-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
            {q.options.map((opt, oi) => (
              <div key={oi} className="text-xs" style={{
                padding: '0.3rem 0.6rem', borderRadius: 4,
                background: oi === q.correctAnswer ? 'var(--success-light)' : 'var(--bg-input)',
                color: oi === q.correctAnswer ? 'var(--success)' : 'var(--text-secondary)',
                fontWeight: oi === q.correctAnswer ? 600 : 400,
              }}>
                {optionLetters[oi]}. {opt}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
