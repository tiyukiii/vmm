import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import OnboardingPage from './pages/OnboardingPage';
import App from './pages/App'
import TrackPage from './pages/TrackPage'
import ReviewPage from './pages/ReviewPage'
import Top100Page from './pages/Top100Page'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage' // ✅ добавь импорт

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/track/:slug" element={<TrackPage />} />
        <Route path="/track/:slug/review" element={<ReviewPage />} />
        <Route path="/top100" element={<Top100Page />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/auth" element={<AuthPage />} /> {/* ✅ добавь этот маршрут */}
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
)
