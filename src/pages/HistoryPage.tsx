import { useAttemptHistory } from '../hooks/useData';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime } from '../utils/analytics';
import { Eye, Target } from 'lucide-react';

export default function HistoryPage() {
  const { attempts, loading } = useAttemptHistory();
  const navigate = useNavigate();

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  if (attempts.length === 0) {
    return (
      <div className="empty-state">
        <Target size={48} />
        <h3>No attempts yet</h3>
        <p className="text-sm text-muted">Take your first test to see history here</p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Test</th><th>Mode</th><th>Date</th><th>Score</th>
              <th>Correct</th><th>Wrong</th><th>Time</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a, i) => (
              <tr key={a.id}>
                <td className="text-muted">{attempts.length - i}</td>
                <td className="font-semibold">{a.testName}</td>
                <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{a.mode}</span></td>
                <td className="text-sm">{formatDate(a.startTime)}</td>
                <td className="font-bold">{a.percentage.toFixed(1)}%</td>
                <td style={{ color: 'var(--success)' }}>{a.correct}</td>
                <td style={{ color: 'var(--danger)' }}>{a.wrong}</td>
                <td className="text-sm">{formatTime(a.durationUsed || 0)}</td>
                <td>
                  <span className={`badge ${a.status === 'timed-out' ? 'badge-warning' : 'badge-success'}`}>
                    {a.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/results/${a.id}`)}>
                    <Eye size={14} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="mobile-only">
        {attempts.map((a) => (
          <div key={a.id} className="history-mobile-card" onClick={() => navigate(`/results/${a.id}`)}>
            <div className="history-mobile-card-top">
              <div className="history-mobile-card-info">
                <div className="font-semibold truncate">{a.testName}</div>
                <div className="text-xs text-muted">{formatDate(a.startTime)}</div>
              </div>
              <div className="history-mobile-card-score">
                <div className="font-bold" style={{ fontSize: '1.1rem' }}>{a.percentage.toFixed(1)}%</div>
                <span className={`badge ${a.status === 'timed-out' ? 'badge-warning' : 'badge-success'}`}>
                  {a.status === 'timed-out' ? 'Timed out' : 'Done'}
                </span>
              </div>
            </div>
            <div className="history-mobile-card-stats">
              <span style={{ color: 'var(--success)' }}>✓ {a.correct}</span>
              <span style={{ color: 'var(--danger)' }}>✗ {a.wrong}</span>
              <span className="text-muted">{formatTime(a.durationUsed || 0)}</span>
              <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{a.mode}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
