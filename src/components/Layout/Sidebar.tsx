import { NavLink } from 'react-router-dom';
import { useSettingsStore } from '../../store/settingsStore';
import {
  LayoutDashboard, FileText, BarChart3, History, Settings,
  Sun, Moon, Monitor, X, Database, Bookmark, Brain, Shuffle
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tests', icon: FileText, label: 'My Tests' },
  { to: '/question-bank', icon: Database, label: 'Question Bank' },
  { to: '/history', icon: History, label: 'Attempt History' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { to: '/study', icon: Brain, label: 'Study Mode' },
  { to: '/practice', icon: Shuffle, label: 'Practice Mode' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, theme, setTheme } = useSettingsStore();

  const themeIcon = theme === 'dark' ? Sun : theme === 'light' ? Moon : Monitor;
  const ThemeIcon = themeIcon;

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99,
          }}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand">
          <div className="logo">M</div>
          <div>
            <h1>MCQ Exam</h1>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Exam System</div>
          </div>
          <button
            className="btn-icon"
            onClick={() => setSidebarOpen(false)}
            style={{ marginLeft: 'auto', display: window.innerWidth <= 1024 ? 'flex' : 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => { if (window.innerWidth <= 1024) setSidebarOpen(false); }}
              end={item.to === '/'}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-sm w-full" onClick={cycleTheme}>
            <ThemeIcon size={16} />
            <span style={{ textTransform: 'capitalize' }}>{theme}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
