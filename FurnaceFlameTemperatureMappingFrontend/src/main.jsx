// main.jsx
/**
 * Enhanced React entry point with beautiful loading UI/UX.
 *
 * Features:
 *  • Enhanced loading fallback with beautiful animations
 *  • Gradient backgrounds and visual effects
 *  • Smooth transitions and professional design
 *  • Better typography and spacing
 *  • Error boundary integration
 *  • Sentry error tracking
 *  • Code splitting with lazy loading
 *  • React Router configuration
 */

import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import * as Sentry from '@sentry/browser';
import ErrorBoundary from '../components/ErrorBoundary';
import './index.css';

// Lazy-load pages for better performance
const LoginPage = lazy(() => import('./LoginPage'));
const StationSelect = lazy(() => import('./StationSelect'));
const App = lazy(() => import('./App'));
const EventLog = lazy(() => import('./EventLog'));
const Furnace3DView = lazy(() => import('./furnace3d/Furnace3DView'));

// Initialize Sentry for error tracking
Sentry.init({
  dsn: 'https://84f5989145ac045cdff7921af7758749@o4511590229016576.ingest.de.sentry.io/4511590242189392',
});

/**
 * Enhanced Loading Fallback Component
 * Features:
 *  • Beautiful gradient background
 *  • Animated loading spinner
 *  • Enhanced typography
 *  • Professional industrial aesthetic
 */
const LoadingFallback = () => {
  // Inject CSS for animations
  if (typeof document !== 'undefined' && !document.getElementById('loading-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      
      @keyframes fadeSlideUp {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
    `;
    document.head.appendChild(style);
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
        animation: 'pulse 3s ease-in-out infinite',
      }} />
      
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '20%',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(129, 140, 248, 0.15) 0%, transparent 70%)',
        animation: 'pulse 4s ease-in-out infinite',
        animationDelay: '1s',
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '30%',
        right: '20%',
        width: '250px',
        height: '250px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
        animation: 'pulse 5s ease-in-out infinite',
        animationDelay: '2s',
      }} />
      
      {/* Loading content */}
      <div style={{
        textAlign: 'center',
        animation: 'fadeSlideUp 0.6s ease both',
        zIndex: 1,
      }}>
        {/* Animated spinner */}
        <div style={{
          width: '60px',
          height: '60px',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          margin: '0 auto 24px',
          animation: 'spin 1s linear infinite',
          boxShadow: '0 0 24px rgba(99, 102, 241, 0.3)',
        }} />
        
        {/* Loading text */}
        <div style={{
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          marginBottom: '8px',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}>
          Loading
        </div>
        
        {/* Subtitle */}
        <div style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '13px',
          fontWeight: 400,
          letterSpacing: '0.08em',
        }}>
          Furnace Flame Temperature Mapping System
        </div>
        
        {/* Progress indicator dots */}
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          marginTop: '20px',
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.6)',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Render the application
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/station-select" element={<StationSelect />} />
            <Route path="/dashboard" element={<App />} />
            <Route path="/event-log" element={<EventLog />} />
            <Route path="/furnace-3d" element={<Furnace3DView />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
