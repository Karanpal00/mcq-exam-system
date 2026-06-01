import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSettingsStore } from '../../store/settingsStore';
import { Menu } from 'lucide-react';
import ProfileWidget from './ProfileWidget';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tests': 'My Tests',
  '/tests/create': 'Create Test',
  '/question-bank': 'Question Bank',
  '/history': 'Attempt History',
  '/analytics': 'Analytics',
  '/bookmarks': 'Bookmarks',
  '/study': 'Study Mode',
  '/practice': 'Practice Mode',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const { sidebarOpen, setSidebarOpen } = useSettingsStore();
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'MCQ Exam System';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ marginLeft: sidebarOpen ? 260 : 0 }}>
        <header className="topbar">
          <div className="flex items-center gap-sm">
            <button className="btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h2>
          </div>
          <ProfileWidget />
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
