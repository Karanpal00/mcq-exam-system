import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useData';
import {
  FileText, Database, Target, Trophy, TrendingUp, Flame,
  Plus, Play, Eye, BarChart3, Trash2, Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { testRepo, attemptRepo } from '../db/repository';
import { useToastStore } from '../components/Common/Toast';
import Modal from '../components/Common/Modal';
import { formatDate } from '../utils/analytics';

export default function DashboardPage() {
  const { stats, tests, loading, refresh } = useDashboard();
  const navigate = useNavigate();
  const addToast = useToastStore(s => s.addToast);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [testAttempts, setTestAttempts] = useState<Record<number, { count: number; best: number; last: string }>>({});

  // Load attempt stats for each test
  useEffect(() => {
    (async () => {
      const all = await attemptRepo.getAll();
      const map: Record<number, { count: number; best: number; last: string }> = {};
      for (const a of all) {
        if (a.status === 'in-progress') continue;
        if (!map[a.testId]) map[a.testId] = { count: 0, best: 0, last: '' };
        map[a.testId].count++;
        if (a.percentage > map[a.testId].best) map[a.testId].best = a.percentage;
        if (!map[a.testId].last || a.startTime > map[a.testId].last) map[a.testId].last = a.startTime;
      }
      setTestAttempts(map);
    })();
  }, [tests.length]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await testRepo.delete(deleteId);
    addToast('Test deleted', 'success');
    setDeleteId(null);
    refresh();
  };

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  const statCards = [
    { label: 'Tests Created', value: stats?.totalTests || 0, icon: FileText, color: 'purple' },
    { label: 'Question Bank', value: stats?.totalQuestions || 0, icon: Database, color: 'blue' },
    { label: 'Total Attempts', value: stats?.totalAttempts || 0, icon: Target, color: 'green' },
    { label: 'Best Score', value: `${stats?.bestScore || 0}%`, icon: Trophy, color: 'orange' },
    { label: 'Average Score', value: `${Math.round(stats?.averageScore || 0)}%`, icon: TrendingUp, color: 'blue' },
    { label: 'Current Streak', value: `${stats?.currentStreak || 0}d`, icon: Flame, color: 'red' },
  ];

  return (
    <div>
      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><s.icon size={22} /></div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">My Tests</div>
            <div className="card-subtitle">{tests.length} test{tests.length !== 1 ? 's' : ''} created</div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/tests/create')}>
            <Plus size={16} /> Create Test
          </button>
        </div>

        {tests.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No tests yet</h3>  
          </div>
        ) : (
          <div className="table-wrap">
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
                {tests.map(test => {
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
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tests/${test.id}`)}>
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tests/${test.id}/results`)}>
                            <BarChart3 size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(test.id!)}>
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
