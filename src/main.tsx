// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';

import './index.css';

import App from './pages/App';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import ReviewPage from './pages/ReviewPage';
import OnboardingPage from './pages/OnboardingPage';
import Top100Page from './pages/Top100Page';
import TrackPage from './pages/TrackPage';
import AwardPage from './pages/AwardPage'
import TrackGridPage from './pages/TrackGridPage'


import { SessionProvider } from './session'; // <-- Важно

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <SessionProvider>   {/* <-- ВОТ ЭТО ГЛАВНОЕ */}
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/review/:slug" element={<ReviewPage />} />
          <Route path="/award2025" element={<AwardPage />} />
           <Route path="/award2025/track-grid" element={<TrackGridPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/top100" element={<Top100Page />} />
          <Route path="/track/:slug" element={<TrackPage />} />
        </Routes>
      </SessionProvider>
    </HashRouter>
  </React.StrictMode>
);
