import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSettingsStore } from '../../store/settingsStore';
import { Menu, ArrowUp } from 'lucide-react';
import ProfileWidget from './ProfileWidget';
import { useState, useEffect, useRef } from 'react';

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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const title = pageTitles[location.pathname] || 'MCQ Exam System';

  // Track scroll position of main-content area
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Reset scroll on route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    setShowScrollTop(false);
  }, [location.pathname]);

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content" ref={mainRef} style={{ marginLeft: sidebarOpen ? 260 : 0 }}>
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

      {/* Scroll to Top Button */}
      <button
        className={`scroll-to-top-btn ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}
