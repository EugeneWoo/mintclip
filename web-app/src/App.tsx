import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './components/Landing'
import { Dashboard } from './components/Dashboard'
import { Library } from './components/Library'
import { AuthCallback } from './components/AuthCallback'
import { Notifications } from './components/Notifications'
import PrivacyPolicy from './components/legal/PrivacyPolicy'
import TermsOfService from './components/legal/TermsOfService'
import CookiePolicy from './components/legal/CookiePolicy'
import GDPRCompliance from './components/legal/GDPRCompliance'
import DataProcessingAgreement from './components/legal/DataProcessingAgreement'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();

    // Listen for storage changes (when AuthCallback sets tokens)
    const handleStorageChange = () => {
      checkAuth();
    };

    // Listen for custom auth event (dispatched by AuthCallback)
    const handleAuthChange = () => {
      // Small delay to ensure localStorage is updated
      setTimeout(() => {
        checkAuth();
      }, 50);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('mintclip_access_token');
    const newAuthState = !!token;

    console.log('[App] Auth check:', {
      hasToken: !!token,
      isAuthenticated: newAuthState,
      currentPath: window.location.pathname
    });

    setIsAuthenticated(newAuthState);
    setIsCheckingAuth(false);
  };

  if (isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#171717',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />}
        />

        {/* Auth callback */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Public routes */}
        <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/legal/terms-of-service" element={<TermsOfService />} />
        <Route path="/legal/cookie-policy" element={<CookiePolicy />} />
        <Route path="/legal/gdpr-compliance" element={<GDPRCompliance />} />
        <Route path="/legal/data-processing-agreement" element={<DataProcessingAgreement />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />}
        />
        <Route
          path="/notifications"
          element={isAuthenticated ? <Notifications /> : <Navigate to="/" replace />}
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
