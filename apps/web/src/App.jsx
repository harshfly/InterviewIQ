import { useEffect, Component } from 'react';
import useStore from './lib/store';
import useHotkeys from './hooks/useHotkeys';
import SessionSetup from './components/SessionSetup/SessionSetup';
import LiveSession from './components/SessionSetup/LiveSession';
import History from './components/History/History';
import Settings from './components/Settings/Settings';
import './App.css';

// Error Boundary — prevents white screen of death
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#FAFAF9', background: '#07070a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ color: '#A8A29E', maxWidth: '400px' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ padding: '10px 24px', background: '#22c55e', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { currentView, setView, session, toasts, fetchHealth } = useStore();

  useEffect(() => {
    fetchHealth();
  }, []);

  useHotkeys({
    'Ctrl+Shift+H': () => document.dispatchEvent(new CustomEvent('toggle-overlay')),
    'Ctrl+Shift+R': () => useStore.getState().regenerateAnswer(),
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
