import { useState } from 'react';
import useStore from '../../lib/store';
import api from '../../lib/api';
import './History.css';

export default function History() {
  const { session, qaHistory, setView, addToast } = useStore();
  const [debrief, setDebrief] = useState(null);
  const [loadingDebrief, setLoadingDebrief] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const handleDebrief = async () => {
    if (!session) return;
    setLoadingDebrief(true);
    try {
      const result = await api.generateDebrief(session.session_id);
      setDebrief(result.debrief);
    } catch (e) {
      addToast(`Debrief failed: ${e.message}`, 'error');
    } finally {
      setLoadingDebrief(false);
    }
  };

  return (
    <div className="history-page">
      <div className="history-top">
        <div>
          <h1>History</h1>
          {session && (
            <p className="history-sub">{session.job_position} · {session.company}</p>
          )}
        </div>
        <div className="history-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setView('live')}>
            Back to session
          </button>
          {session && qaHistory.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={handleDebrief} disabled={loadingDebrief}>
              {loadingDebrief ? <><span className="spinner" /> Generating...</> : 'Generate debrief'}
            </button>
          )}
        </div>
      </div>

      {debrief && (
        <div className="debrief card animate-in-up">
          <div className="debrief-top">
            <h2>Debrief</h2>
            <span className="tag">AI analysis</span>
          </div>
          <div className="debrief-body">
            <pre>{debrief}</pre>
          </div>
        </div>
      )}

      <div className="qa-list">
        {qaHistory.length === 0 ? (
          <div className="history-empty">
            <p className="empty-title">No questions yet</p>
            <p className="empty-desc">Questions and answers will appear here during the session.</p>
          </div>
        ) : (
          qaHistory.map((qa, i) => (
            <div
              key={i}
              className={`qa-item card ${expanded === i ? 'qa-item--open' : ''}`}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="qa-item-top">
                <span className="qa-num">{i + 1}</span>
                <div className="qa-preview">
                  <p className="qa-q-text">{qa.question}</p>
                  <div className="qa-item-meta">
                    {qa.type && <span className="tag">{qa.type}</span>}
                    <span className="qa-time">{new Date(qa.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <span className={`qa-chevron ${expanded === i ? 'qa-chevron--open' : ''}`}>›</span>
              </div>

              {expanded === i && (
                <div className="qa-item-body animate-in">
                  <div className="qa-section">
                    <h4>Question</h4>
                    <p>{qa.question}</p>
                  </div>
                  <div className="qa-section">
                    <h4>Answer</h4>
                    <p className="qa-answer">{qa.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
