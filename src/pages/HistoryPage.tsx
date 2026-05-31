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
    <div className="table-wrap">
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
  );
}
