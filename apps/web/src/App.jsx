import { useEffect } from 'react';
import useStore from './lib/store';
import useHotkeys from './hooks/useHotkeys';
import SessionSetup from './components/SessionSetup/SessionSetup';
import LiveSession from './components/SessionSetup/LiveSession';
import History from './components/History/History';
import Settings from './components/Settings/Settings';
import './App.css';

export default function App() {
  const { currentView, setView, session, toasts, fetchHealth } = useStore();

  useEffect(() => {
    fetchHealth();
  }, []);

  useHotkeys({
    'Ctrl+Shift+H': () => document.dispatchEvent(new CustomEvent('toggle-overlay')),
    'Ctrl+Shift+R': () => document.dispatchEvent(new CustomEvent('regenerate-answer')),
    'Ctrl+Shift+P': () => document.dispatchEvent(new CustomEvent('toggle-pause')),
  });

  const renderView = () => {
    switch (currentView) {
      case 'setup': return <SessionSetup />;
      case 'live': return <LiveSession />;
      case 'history': return <History />;
      case 'settings': return <Settings />;
      default: return <SessionSetup />;
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-logo" onClick={() => setView(session ? 'live' : 'setup')}>
          <div className="logo-mark">IQ</div>
          <span>InterviewIQ</span>
        </div>

        <nav className="app-nav">
          {session && (
            <>
              <button
                className={`nav-item ${currentView === 'live' ? 'active' : ''}`}
                onClick={() => setView('live')}
              >
                Session
              </button>
              <button
                className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
                onClick={() => setView('history')}
              >
                History
              </button>
            </>
          )}
          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {renderView()}
      </main>

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
