import { useEffect } from 'react';
import useStore from '../../lib/store';
import useAudioCapture from '../../hooks/useAudioCapture';
import Overlay from '../Overlay/Overlay';
import Transcript from '../Transcript/Transcript';
import './LiveSession.css';

export default function LiveSession() {
  const {
    session,
    audioStatus,
    isListening,
    isPaused,
    qaHistory,
    endSession,
    setView,
    setIsPaused,
    addToast,
  } = useStore();

  const { startCapture, stopCapture, toggleCapture, error } = useAudioCapture();

  useEffect(() => {
    return () => stopCapture();
  }, []);

  const handleEnd = async () => {
    stopCapture();
    await endSession();
    addToast('Session ended.', 'info');
  };

  const statusLabel = {
    idle: 'Ready',
    listening: 'Listening',
    generating: 'Generating',
    paused: 'Paused',
  }[audioStatus] || 'Ready';

  return (
    <div className="live-page">
      <Overlay toggleCapture={toggleCapture} />

      <div className="live-panel animate-in-up">
        {/* Session bar */}
        <div className="session-bar card">
          <div className="session-bar-left">
            <div className="session-identity">
              <h2>{session?.job_position} <span className="sep">·</span> {session?.company}</h2>
              <div className="session-status-row">
                <span className={`status-indicator ${audioStatus === 'listening' ? 'active' : audioStatus === 'generating' ? 'processing' : 'idle'}`} />
                <span className="status-label">{statusLabel}</span>
                <span className="sep">·</span>
                <span className="qa-count">{qaHistory.length} answered</span>
              </div>
            </div>
          </div>
          <div className="session-bar-right">
            <button className="btn btn-secondary btn-sm" onClick={() => setView('history')}>
              History
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleEnd}>
              End
            </button>
          </div>
        </div>

        {/* Audio controls */}
        <div className="audio-row card">
          <button
            id="toggle-audio"
            className={`audio-toggle ${isListening ? 'audio-toggle--active' : ''}`}
            onClick={toggleCapture}
          >
            <span className="audio-toggle-dot" />
            {isListening ? 'Stop listening' : 'Start listening'}
          </button>

          {isListening && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}

          {error && <span className="audio-error">{error}</span>}

          <div className="hotkey-hints">
            <span><kbd>Ctrl+Shift+H</kbd> overlay</span>
            <span><kbd>Ctrl+Shift+R</kbd> regenerate</span>
            <span><kbd>Ctrl+Shift+P</kbd> pause</span>
          </div>
        </div>

        <Transcript />
      </div>
    </div>
  );
}
