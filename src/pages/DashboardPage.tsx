import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useData';
import {
  FileText, Database, Target, Trophy, TrendingUp, Flame,
  Plus, BarChart3, BookMarked, Brain, HelpCircle
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database';
import type { Attempt } from '../types';
import { formatDate } from '../utils/analytics';

export default function DashboardPage() {
  const { stats, loading } = useDashboard();
  const navigate = useNavigate();

  // Reactive recent attempts
  const recentAttempts = useLiveQuery(async () => {
    const all = await db.attempts
      .where('status')
      .anyOf(['completed', 'auto-submitted', 'timed-out'])
      .toArray();
    return all
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 5);
  }, [], [] as Attempt[]);

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  const statCards = [
    { label: 'Tests Created', value: stats?.totalTests || 0, icon: FileText, color: 'purple' },
    { label: 'Question Bank', value: stats?.totalQuestions || 0, icon: Database, color: 'blue' },
    { label: 'Total Attempts', value: stats?.totalAttempts || 0, icon: Target, color: 'green' },
    { label: 'Best Score', value: `${stats?.bestScore || 0}%`, icon: Trophy, color: 'orange' },
    { label: 'Average Score', value: `${Math.round(stats?.averageScore || 0)}%`, icon: TrendingUp, color: 'blue' },
    { label: 'Current Streak', value: `${stats?.currentStreak || 0}d`, icon: Flame, color: 'red' },
  ];

  const quickActions = [
    {
      title: 'Practice Mode',
      desc: 'Generate customized practice sets with specific difficulties.',
      icon: HelpCircle,
      path: '/practice',
      color: 'blue'
    },
    {
      title: 'Study Mode',
      desc: 'Review questions page-by-page with instant explanations.',
      icon: Brain,
      path: '/study',
      color: 'purple'
    },
    {
      title: 'Create Test',
      desc: 'Build or import full mock exams with multiple sections.',
      icon: Plus,
      path: '/tests/create',
      color: 'green'
    },
    {
      title: 'Review Bookmarks',
      desc: 'Study your flagged and bookmarked questions.',
      icon: BookMarked,
      path: '/bookmarks',
      color: 'orange'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Stats Grid */}
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

      {/* Quick Actions Grid */}
      <div>
        <h3 className="section-title" style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {quickActions.map(act => (
            <div
              key={act.title}
              className="card"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                gap: '1rem',
                padding: '1.25rem'
              }}
              onClick={() => navigate(act.path)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                className={`stat-icon ${act.color}`}
                style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: 'var(--radius-sm)' }}
              >
                <act.icon size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{act.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{act.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Attempts list */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Activity</div>
            <div className="card-subtitle">Your last 5 exam attempts</div>
          </div>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <Target size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontWeight: 600 }}>No attempts yet</h4>
            <p className="text-xs text-muted">Complete an exam or practice session to view your activity here.</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="table-wrap desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Mode</th>
                    <th>Date & Time</th>
                    <th>Correct/Wrong</th>
                    <th>Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttempts.map(attempt => (
                    <tr key={attempt.id}>
                      <td className="font-semibold">{attempt.testName}</td>
                      <td>
                        <span className={`badge ${attempt.mode === 'study' ? 'badge-info' : 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>
                          {attempt.mode}
                        </span>
                      </td>
                      <td className="text-sm text-muted">{formatDate(attempt.startTime)}</td>
                      <td>
                        <span style={{ color: 'var(--success)' }}>{attempt.correct}</span>
                        {' / '}
                        <span style={{ color: 'var(--danger)' }}>{attempt.wrong}</span>
                      </td>
                      <td>
                        <span className={`badge ${attempt.percentage >= 50 ? 'badge-success' : 'badge-warning'}`}>
                          {Math.round(attempt.percentage)}%
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/tests/${attempt.testId}/results`)}
                          title="View analysis report"
                        >
                          <BarChart3 size={14} /> Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentAttempts.map(attempt => (
                <div
                  key={attempt.id}
                  className="test-mobile-card"
                  style={{ cursor: 'pointer', padding: '1rem' }}
                  onClick={() => navigate(`/tests/${attempt.testId}/results`)}
                >
                  <div className="test-mobile-card-header" style={{ marginBottom: '0.25rem' }}>
                    <div className="font-semibold truncate">{attempt.testName}</div>
                    <span className={`badge ${attempt.percentage >= 50 ? 'badge-success' : 'badge-warning'}`}>
                      {Math.round(attempt.percentage)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted">
                    <div>{formatDate(attempt.startTime)}</div>
                    <div style={{ textTransform: 'capitalize' }}>{attempt.mode}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
