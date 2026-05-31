import { useState, useEffect } from 'react';
import { bookmarkRepo, questionRepo } from '../db/repository';
import type { Bookmark, Question } from '../types';
import { Bookmark as BookmarkIcon, Folder, Trash2 } from 'lucide-react';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [questions, setQuestions] = useState<Map<number, Question>>(new Map());
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState('all');
  const [loading, setLoading] = useState(true);
  const optionLetters = ['A', 'B', 'C', 'D'];

  const refresh = async () => {
    const [bm, f] = await Promise.all([bookmarkRepo.getAll(), bookmarkRepo.getFolders()]);
    setBookmarks(bm);
    setFolders(f);
    const qIds = [...new Set(bm.map(b => b.questionId))];
    const qs = await questionRepo.getByIds(qIds);
    setQuestions(new Map(qs.map(q => [q.id!, q])));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = activeFolder === 'all' ? bookmarks : bookmarks.filter(b => b.folder === activeFolder);

  const handleRemove = async (qId: number) => {
    await bookmarkRepo.remove(qId);
    refresh();
  };

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  return (
    <div>
      {bookmarks.length === 0 ? (
        <div className="empty-state">
          <BookmarkIcon size={48} />
          <h3>No bookmarks yet</h3>
          <p className="text-sm text-muted">Bookmark questions during exams to review later</p>
        </div>
      ) : (
        <>
          <div className="flex gap-sm mb-2" style={{ flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${activeFolder === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveFolder('all')}>
              All ({bookmarks.length})
            </button>
            {folders.map(f => (
              <button key={f} className={`btn btn-sm ${activeFolder === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveFolder(f)}>
                <Folder size={14} /> {f} ({bookmarks.filter(b => b.folder === f).length})
              </button>
            ))}
          </div>

          {filtered.map(bm => {
            const q = questions.get(bm.questionId);
            if (!q) return null;
            return (
              <div key={bm.id} className="review-card" style={{ marginBottom: '0.5rem' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-sm">
                    <span className="badge badge-primary">{bm.folder}</span>
                    {q.sectionName && <span className="badge badge-info">{q.sectionName}</span>}
                  </div>
                  <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleRemove(bm.questionId)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-sm" style={{ lineHeight: 1.6 }}>{q.text}</div>
                <div className="mt-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem' }}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="text-xs" style={{
                      padding: '0.2rem 0.5rem', borderRadius: 4,
                      background: oi === q.correctAnswer ? 'var(--success-light)' : 'var(--bg-input)',
                      color: oi === q.correctAnswer ? 'var(--success)' : 'var(--text-secondary)',
                    }}>
                      {optionLetters[oi]}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
