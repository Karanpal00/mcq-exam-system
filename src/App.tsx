import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useSettingsStore } from './store/settingsStore';
import { useCloudSyncStore } from './store/cloudSyncStore';
import AppLayout from './components/Layout/AppLayout';
import ToastContainer from './components/Common/Toast';
import DashboardPage from './pages/DashboardPage';
import CreateTestPage from './pages/CreateTestPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import TestViewPage from './pages/TestViewPage';
import QuestionBankPage from './pages/QuestionBankPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import StudyModePage from './pages/StudyModePage';
import BookmarksPage from './pages/BookmarksPage';
import PracticeModePage from './pages/PracticeModePage';
import './index.css';

export default function App() {
  const initTheme = useSettingsStore(s => s.initTheme);
  const initCloudSync = useCloudSyncStore(s => s.initCloudSync);

  useEffect(() => {
    initTheme();
    initCloudSync();
  }, [initTheme, initCloudSync]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Exam runs without the app shell layout */}
        <Route path="/exam/:testId" element={<ExamPage />} />
        <Route path="/practice/exam" element={<ExamPage />} />

        {/* All other pages use the sidebar layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tests" element={<DashboardPage />} />
          <Route path="/tests/create" element={<CreateTestPage />} />
          <Route path="/tests/:testId" element={<TestViewPage />} />
          <Route path="/tests/:testId/results" element={<HistoryPage />} />
          <Route path="/results/:attemptId" element={<ResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/question-bank" element={<QuestionBankPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/study" element={<StudyModePage />} />
          <Route path="/practice" element={<PracticeModePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
