import { useState } from 'react';
import { useQuestionBank } from '../hooks/useData';
import { questionRepo } from '../db/repository';
import { useToastStore } from '../components/Common/Toast';
import { Search, Filter, Database, Save } from 'lucide-react';

export default function QuestionBankPage() {
  const { questions, tags, loading, refresh } = useQuestionBank();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [editingTags, setEditingTags] = useState<Record<number, string>>({});
  const addToast = useToastStore(s => s.addToast);
  const optionLetters = ['A', 'B', 'C', 'D'];

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  const filtered = questions.filter(q => {
    const ms = !search || q.text.toLowerCase().includes(search.toLowerCase());
    const mt = tagFilter === 'all' || q.tags.includes(tagFilter) || q.sectionName === tagFilter;
    const md = diffFilter === 'all' || q.difficulty === diffFilter;
    return ms && mt && md;
  });

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon purple"><Database size={20} /></div>
          <div><div className="stat-value">{questions.length}</div><div className="stat-label">Total Questions</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Filter size={20} /></div>
          <div><div className="stat-value">{questions.filter(q=>q.difficulty==='easy').length}</div><div className="stat-label">Easy</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Filter size={20} /></div>
          <div><div className="stat-value">{questions.filter(q=>q.difficulty==='medium').length}</div><div className="stat-label">Medium</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><Filter size={20} /></div>
          <div><div className="stat-value">{questions.filter(q=>q.difficulty==='hard').length}</div><div className="stat-label">Hard</div></div>
        </div>
      </div>

      <div className="flex gap-sm mb-2" style={{ flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <Search size={18} />
          <input className="form-input" style={{ paddingLeft: '2.5rem' }}
            placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
          <option value="all">All Tags</option>
          {tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={diffFilter} onChange={e => setDiffFilter(e.target.value)}>
          <option value="all">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div className="text-sm text-muted mb-1">{filtered.length} questions</div>
      {filtered.slice(0, 100).map(q => (
        <div key={q.id} className="review-card" style={{ marginBottom: '0.5rem' }}>
          <div className="flex items-center gap-sm mb-1">
            <span className="badge badge-muted">#{q.id}</span>
            {q.sectionName && <span className="badge badge-info">{q.sectionName}</span>}
            <select className="form-select" style={{ width: 110, padding: '0.25rem 0.5rem' }}
              value={q.difficulty}
              onChange={async e => {
                await questionRepo.update(q.id!, { difficulty: e.target.value as typeof q.difficulty });
                refresh();
                addToast('Difficulty updated', 'success');
              }}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="text-sm" style={{ lineHeight: 1.6 }}>{q.text}</div>
          <div className="mt-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem' }}>
            {q.options.map((opt, oi) => (
              <div key={oi} className="text-xs" style={{
                padding: '0.2rem 0.5rem', borderRadius: 4,
                background: 'var(--bg-input)',
                color: 'var(--text-secondary)',
              }}>
                {optionLetters[oi]}. {opt}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-sm mt-1">
            <input
              className="form-input"
              style={{ maxWidth: 360 }}
              value={editingTags[q.id!] ?? q.tags.join(', ')}
              onChange={e => setEditingTags(prev => ({ ...prev, [q.id!]: e.target.value }))}
              placeholder="tags, comma separated"
            />
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              const raw = editingTags[q.id!] ?? q.tags.join(', ');
              const nextTags = raw.split(',').map(t => t.trim()).filter(Boolean);
              await questionRepo.update(q.id!, { tags: nextTags });
              refresh();
              addToast('Tags updated', 'success');
            }}>
              <Save size={14} /> Save Tags
            </button>
          </div>
        </div>
      ))}
      {filtered.length > 100 && <div className="text-center text-muted text-sm mt-2">Showing first 100 of {filtered.length}</div>}
    </div>
  );
}
