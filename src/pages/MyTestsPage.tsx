import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useData';
import {
  FileText, Play, Eye, BarChart3, Trash2, Clock, Plus, Search
} from 'lucide-react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database';
import { testRepo } from '../db/repository';
import { useToastStore } from '../components/Common/Toast';
import Modal from '../components/Common/Modal';
import { formatDate } from '../utils/analytics';

export default function MyTestsPage() {
  const { tests, loading } = useDashboard();
  const navigate = useNavigate();
  const addToast = useToastStore(s => s.addToast);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Reactive attempt stats
  const testAttempts = useLiveQuery(async () => {
    const all = await db.attempts.toArray();
    const map: Record<number, { count: number; best: number; last: string }> = {};
    for (const a of all) {
      if (a.status === 'in-progress') continue;
      if (!map[a.testId]) map[a.testId] = { count: 0, best: 0, last: '' };
      map[a.testId].count++;
      if (a.percentage > map[a.testId].best) map[a.testId].best = a.percentage;
      if (!map[a.testId].last || a.startTime > map[a.testId].last) map[a.testId].last = a.startTime;
    }
    return map;
  }, [], {} as Record<number, { count: number; best: number; last: string }>);

  const handleDelete = async () => {
    if (!deleteId) return;
    await testRepo.delete(deleteId);
    addToast('Test deleted', 'success');
    setDeleteId(null);
  };

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  const filteredTests = tests.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="card-title">My Tests</div>
            <div className="card-subtitle">{tests.length} test{tests.length !== 1 ? 's' : ''} total</div>
          </div>
          <div className="flex gap-sm" style={{ flex: 1, justifyContent: 'flex-end', minWidth: '280px', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ width: '220px', margin: 0 }}>
              <Search size={18} />
              <input
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search tests..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/tests/create')}>
              <Plus size={16} /> Create Test
            </button>
          </div>
        </div>

        {filteredTests.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>{searchQuery ? 'No matching tests found' : 'No tests yet'}</h3>
            <p>{searchQuery ? 'Try modifying your search keywords.' : 'Create a new test to get started.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="table-wrap desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Questions</th>
                    <th>Duration</th>
                    <th>Attempts</th>
                    <th>Best Score</th>
                    <th>Last Attempt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map(test => {
                    const qCount = test.sections.reduce((s, sec) => s + sec.questionIds.length, 0);
                    const ta = testAttempts[test.id!];
                    return (
                      <tr key={test.id}>
                        <td>
                          <div className="font-semibold">{test.name}</div>
                          <div className="text-xs text-muted">{test.sections.length} section{test.sections.length !== 1 ? 's' : ''}</div>
                        </td>
                        <td>{qCount}</td>
                        <td><Clock size={14} style={{ verticalAlign: 'middle' }} /> {test.duration}m</td>
                        <td>{ta?.count || 0}</td>
                        <td>{ta ? <span className="badge badge-success">{Math.round(ta.best)}%</span> : '-'}</td>
                        <td className="text-sm text-muted">{ta?.last ? formatDate(ta.last) : 'Never'}</td>
                        <td>
                          <div className="flex gap-sm">
                            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/exam/${test.id}`)}>
                              <Play size={14} /> Start
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tests/${test.id}`)} title="View questions">
                              <Eye size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tests/${test.id}/results`)} title="View analytics">
                              <BarChart3 size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(test.id!)} title="Delete test">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list view */}
            <div className="mobile-only">
              {filteredTests.map(test => {
                const qCount = test.sections.reduce((s, sec) => s + sec.questionIds.length, 0);
                const ta = testAttempts[test.id!];
                return (
                  <div key={test.id} className="test-mobile-card">
                    <div className="test-mobile-card-header">
                      <div className="test-mobile-card-info">
                        <div className="font-semibold truncate">{test.name}</div>
                        <div className="text-xs text-muted">
                          {qCount} Q • {test.duration}m • {test.sections.length} sec{test.sections.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {ta ? (
                        <span className="badge badge-success">{Math.round(ta.best)}%</span>
                      ) : (
                        <span className="badge badge-muted">New</span>
                      )}
                    </div>
                    <div className="test-mobile-card-meta">
                      {ta ? (
                        <span className="text-xs text-muted">{ta.count} attempt{ta.count !== 1 ? 's' : ''} • Last: {formatDate(ta.last)}</span>
                      ) : (
                        <span className="text-xs text-muted">No attempts yet</span>
                      )}
                    </div>
                    <div className="test-mobile-card-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/exam/${test.id}`)}>
                        <Play size={14} /> Start
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tests/${test.id}`)}>
                        <Eye size={14} /> View
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tests/${test.id}/results`)}>
                        <BarChart3 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(test.id!)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Test?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </>
        }
      >
        <p>This will permanently delete this test, its questions, and all attempt history.</p>
        <p className="text-sm text-muted mt-1">This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
