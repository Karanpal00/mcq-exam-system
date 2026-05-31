import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  CategoryScale, Chart as ChartJS, LinearScale, LineElement, BarElement,
  PointElement, Tooltip, Legend
} from 'chart.js';
import { getIncorrectQuestions, getPerformanceTrends, getTimeAnalytics, getWeakAreas } from '../utils/analytics';
import { attemptRepo, questionRepo, testRepo } from '../db/repository';
import type { Attempt, PerformanceTrend, Question, Test, WeakArea } from '../types';
import { TrendingUp, AlertTriangle, Clock, XCircle } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, LineElement, BarElement, PointElement, Tooltip, Legend);

export default function AnalyticsPage() {
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [latestAttempt, setLatestAttempt] = useState<Attempt | null>(null);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [wa, ts] = await Promise.all([getWeakAreas(), testRepo.getAll()]);
      setWeakAreas(wa);
      setTests(ts);
      if (ts.length > 0) {
        setSelectedTest(ts[0].id!);
        await loadTestAnalytics(ts[0].id!);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      loadTestAnalytics(selectedTest);
    }
  }, [selectedTest]);

  const loadTestAnalytics = async (testId: number) => {
    const [trendData, latest, questions, incorrect] = await Promise.all([
      getPerformanceTrends(testId),
      attemptRepo.getLatest(testId),
      questionRepo.getByTestId(testId),
      getIncorrectQuestions(testId),
    ]);
    setTrends(trendData);
    setLatestAttempt(latest && latest.status !== 'in-progress' ? latest : null);
    setTestQuestions(questions);
    setIncorrectCount(incorrect.length);
  };

  if (loading) return <div className="empty-state"><h3>Loading...</h3></div>;

  return (
    <div>
      {/* Weak Areas */}
      <div className="card mb-2">
        <div className="card-header">
          <div className="card-title flex items-center gap-sm">
            <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
            Weak Areas
          </div>
        </div>
        {weakAreas.length === 0 ? (
          <div className="text-sm text-muted">Take some exams to see your weak areas</div>
        ) : (
          <div>
            {weakAreas.slice(0, 10).map(wa => (
              <div key={wa.tag} className="flex items-center justify-between" style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span className="font-semibold">{wa.tag}</span>
                  <span className="text-xs text-muted" style={{ marginLeft: 8 }}>{wa.totalAttempted} attempted</span>
                </div>
                <div className="flex items-center gap-sm">
                  <div className="progress-bar" style={{ width: 100 }}>
                    <div className="progress-fill" style={{
                      width: `${wa.accuracy}%`,
                      background: wa.accuracy < 50 ? 'var(--danger)' : wa.accuracy < 75 ? 'var(--warning)' : 'var(--success)'
                    }} />
                  </div>
                  <span className="text-sm font-bold" style={{
                    color: wa.accuracy < 50 ? 'var(--danger)' : wa.accuracy < 75 ? 'var(--warning)' : 'var(--success)',
                    minWidth: 45, textAlign: 'right'
                  }}>
                    {wa.accuracy.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Trends */}
      <div className="card">
        <div className="card-header">
          <div className="card-title flex items-center gap-sm">
            <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
            Performance Trends
          </div>
          <select className="form-select" style={{ width: 'auto' }}
            value={selectedTest || ''} onChange={e => setSelectedTest(+e.target.value)}>
            {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {trends.length === 0 ? (
          <div className="text-sm text-muted">No attempts for this test yet</div>
        ) : (
          <div>
            <div style={{ height: 260, padding: '1rem 0' }}>
              <Line
                data={{
                  labels: trends.map((_, i) => `Attempt ${i + 1}`),
                  datasets: [{
                    label: 'Score %',
                    data: trends.map(t => t.percentage),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    tension: 0.3,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }}
              />
            </div>
            <div className="table-wrap mt-2">
              <table>
                <thead><tr><th>#</th><th>Date</th><th>Score</th><th>%</th><th>Time</th></tr></thead>
                <tbody>
                  {trends.map((t, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="text-sm">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="font-bold">{t.score}</td>
                      <td><span className={`badge ${t.percentage >= 70 ? 'badge-success' : t.percentage >= 40 ? 'badge-warning' : 'badge-danger'}`}>{t.percentage.toFixed(1)}%</span></td>
                      <td className="text-sm">{Math.floor(t.timeTaken / 60)}m {t.timeTaken % 60}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="stats-grid mt-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon red"><XCircle size={20} /></div>
          <div><div className="stat-value">{incorrectCount}</div><div className="stat-label">Incorrect Collection</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><Clock size={20} /></div>
          <div><div className="stat-value">{latestAttempt?.durationUsed ? Math.round(latestAttempt.durationUsed / 60) : 0}m</div><div className="stat-label">Latest Time Used</div></div>
        </div>
      </div>

      {latestAttempt && (
        <div className="card mt-2">
          <div className="card-header">
            <div className="card-title flex items-center gap-sm"><Clock size={20} /> Time Analytics</div>
          </div>
          <div style={{ height: 260 }}>
            <Bar
              data={{
                labels: latestAttempt.answers.map((_, i) => `Q${i + 1}`),
                datasets: [{
                  label: 'Seconds',
                  data: latestAttempt.answers.map(a => Math.round(a.timeSpent)),
                  backgroundColor: latestAttempt.answers.map(a => a.isCorrect ? '#10b981' : '#ef4444'),
                }],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
          <div className="text-sm text-muted mt-1">
            Average time per recorded question: {getTimeAnalytics(latestAttempt, testQuestions).averageTime.toFixed(1)}s
          </div>
        </div>
      )}
    </div>
  );
}
