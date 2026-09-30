import { useState, useRef, useCallback, useEffect } from 'react';
import Markdown from 'react-markdown';
import useStore from '../../lib/store';
import './Overlay.css';

export default function Overlay({ toggleCapture }) {
  const {
    session,
    currentQuestion,
    currentAnswer,
    isGenerating,
    audioStatus,
    isListening,
    isPaused,
    setIsPaused,
    qaHistory,
    settings,
    updateSettings,
  } = useStore();

  const [visible, setVisible] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 60, y: 60 });
  const [size, setSize] = useState({ width: 440, height: 360 });
  const [poppedOut, setPoppedOut] = useState(false);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const answerStartRef = useRef(null);
  const popupRef = useRef(null);
  const popupIntervalRef = useRef(null);

  // Auto-scroll to the top of the current answer when it starts generating
  useEffect(() => {
    if (currentQuestion) {
      answerStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentQuestion]);

  // Sync state to popup window
  useEffect(() => {
    if (!poppedOut || !popupRef.current || popupRef.current.closed) return;

    const doc = popupRef.current.document;
    const root = doc.getElementById('overlay-root');
    if (!root) return;

    // Build the HTML content for the popup
    let historyHtml = '';
    qaHistory.forEach((qa, i) => {
      historyHtml += `
        <div class="qa-block" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 12px;">
          <div class="q-row"><span class="q-tag">Q</span><span class="q-text">${escapeHtml(qa.question)}</span></div>
          <div class="a-text">${escapeHtml(qa.answer)}</div>
        </div>
      `;
    });

    let activeHtml = '';
    if (currentQuestion) {
      activeHtml += `<div id="scroll-anchor" class="q-row active"><span class="q-tag">Q</span><span class="q-text">${escapeHtml(currentQuestion)}</span></div>`;
      if (currentAnswer || isGenerating) {
        activeHtml += `<div class="a-text">${escapeHtml(currentAnswer)}${isGenerating ? '<span class="cursor">|</span>' : ''}</div>`;
      }
    } else {
      activeHtml = '<div id="scroll-anchor"></div>';
    }

    let emptyHtml = '';
    if (qaHistory.length === 0 && !currentQuestion && !currentAnswer && !isGenerating) {
      emptyHtml = `
        <div class="empty">
          <p class="empty-title">Waiting for questions</p>
          <p class="empty-sub">${isListening ? 'Audio is being captured. Questions will appear automatically.' : 'Start listening in the main window.'}</p>
        </div>
      `;
    }

    const statusText = { idle: 'Ready', listening: 'Listening', generating: 'Generating', paused: 'Paused' }[audioStatus] || 'Ready';
    const statusClass = audioStatus === 'generating' ? 'processing' : audioStatus === 'listening' ? 'active' : 'idle';

    root.innerHTML = `
      <div class="popup-header">
        <span class="dot ${statusClass}"></span>
        <span class="title">${escapeHtml(session?.job_position || '')} · ${escapeHtml(session?.company || '')}</span>
        <span class="status">${statusText}</span>
      </div>
      <div class="popup-body">
        ${emptyHtml}
        ${historyHtml}
        ${activeHtml}
      </div>
    `;

    // Auto-scroll to active question
    const anchor = doc.getElementById('scroll-anchor');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });

  }, [poppedOut, qaHistory, currentQuestion, currentAnswer, isGenerating, audioStatus, isListening, session]);

  // Check if popup was closed
  useEffect(() => {
    if (!poppedOut) return;
    popupIntervalRef.current = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        setPoppedOut(false);
        popupRef.current = null;
      }
    }, 500);
    return () => clearInterval(popupIntervalRef.current);
  }, [poppedOut]);

  // Pop out into a separate always-on-top window
  const handlePopOut = useCallback(() => {
    const popup = window.open('', 'InterviewIQ_Overlay', 
      'width=460,height=400,top=50,left=50,toolbar=no,menubar=no,scrollbars=no,status=no,location=no'
    );
    if (!popup) {
      useStore.getState().addToast('Popup blocked! Please allow popups for this site.', 'error');
      return;
    }

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>InterviewIQ — Overlay</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: rgba(20, 18, 16, ${settings.overlayOpacity});
            color: #FAFAF9;
            font-size: 13px;
            overflow: hidden;
          }
          .popup-header {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            font-size: 11px;
            font-weight: 500;
            color: #A8A29E;
            -webkit-app-region: drag;
            cursor: grab;
          }
          .dot {
            width: 6px; height: 6px; border-radius: 50%;
            flex-shrink: 0;
          }
          .dot.active { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
          .dot.processing { background: #f59e0b; animation: pulse 1s infinite; }
          .dot.idle { background: #78716c; }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
          .title { color: #FAFAF9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .status { margin-left: auto; white-space: nowrap; }
          .popup-body {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            height: calc(100vh - 36px);
          }
          .popup-body::-webkit-scrollbar { width: 4px; }
          .popup-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
          .q-row {
            display: flex;
            gap: 8px;
            padding: 6px 8px;
            background: rgba(255,255,255,0.04);
            border-radius: 6px;
            border-left: 2px solid #A8A29E;
            margin-bottom: 8px;
          }
          .q-row.active { border-left-color: #f59e0b; }
          .q-tag {
            font-size: 10px;
            font-weight: 600;
            color: #A8A29E;
            flex-shrink: 0;
            padding-top: 2px;
          }
          .q-text { color: #A8A29E; line-height: 1.5; }
          .a-text {
            font-size: 13px;
            line-height: 1.7;
            color: #FAFAF9;
            white-space: pre-wrap;
            word-break: break-word;
            padding: 0 2px;
            margin-bottom: 8px;
          }
          .cursor { color: #A8A29E; animation: cursorFade 1s ease-in-out infinite; }
          @keyframes cursorFade { 0%,100% { opacity:1; } 50% { opacity:0; } }
          .empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 4px;
            padding: 40px 16px;
          }
          .empty-title { font-size: 13px; font-weight: 500; color: #A8A29E; }
          .empty-sub { font-size: 12px; color: rgba(168,162,158,0.6); max-width: 240px; line-height: 1.5; }
          .qa-block:last-of-type { border-bottom: none; }
        </style>
      </head>
      <body>
        <div id="overlay-root"></div>
      </body>
      </html>
    `);
    popup.document.close();

    popupRef.current = popup;
    setPoppedOut(true);
    setVisible(false);
  }, []);

  // Drag handlers
  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('.overlay-controls')) return;
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    document.body.style.userSelect = 'none';
  }, [position]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { isDragging.current = false; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // If popped out, show a small "pop back in" button
  if (poppedOut) {
    return (
      <button className="overlay-fab" onClick={() => {
        if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
        popupRef.current = null;
        setPoppedOut(false);
        setVisible(true);
      }} title="Pop overlay back in">
        <span style={{ fontSize: '14px' }}>⊞</span>
      </button>
    );
  }

  if (!visible) {
    return (
      <button className="overlay-fab" onClick={() => setVisible(true)} title="Show overlay">
        <span className={`status-indicator ${isListening ? 'active' : 'idle'}`} />
      </button>
    );
  }

  const statusText = { idle: 'Ready', listening: 'Listening', generating: 'Generating', paused: 'Paused' }[audioStatus] || 'Ready';

  return (
    <div
      className={`overlay ${minimized ? 'overlay--min' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: minimized ? 'auto' : size.width,
        height: minimized ? 'auto' : size.height,
        background: `rgba(20, 18, 16, ${settings.overlayOpacity})`,
      }}
    >
      {/* Header */}
      <div className="overlay-header" onMouseDown={onHeaderMouseDown}>
        <div className="overlay-meta">
          <span className={`status-indicator ${audioStatus === 'generating' ? 'processing' : audioStatus === 'listening' ? 'active' : 'idle'}`} />
          <span className="overlay-context">
            {session?.job_position} <span className="overlay-sep">·</span> {session?.company}
          </span>
          <span className="overlay-sep">|</span>
          <span className="overlay-status">{statusText}</span>
        </div>
        <div className="overlay-controls">
          <button className="overlay-ctrl" onClick={handlePopOut} title="Pop out (float over other apps)">
            ⧉
          </button>
          <button className="overlay-ctrl" onClick={() => setMinimized(!minimized)}>
            {minimized ? '⊞' : '–'}
          </button>
          <button className="overlay-ctrl" onClick={() => setVisible(false)}>×</button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Body */}
          <div className="overlay-body">
            {qaHistory.length === 0 && !currentQuestion && !currentAnswer && !isGenerating && (
              <div className="overlay-empty">
                <p className="empty-primary">Waiting for questions</p>
                <p className="empty-secondary">
                  {isListening
                    ? 'Audio is being captured. Questions will appear automatically.'
                    : 'Start listening or type a question below.'}
                </p>
              </div>
            )}

            {/* Render full history */}
            {qaHistory.map((qa) => (
              <div key={qa.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--overlay-border)' }}>
                <div className="overlay-question">
                  <span className="q-marker">Q</span>
                  <p>{qa.question}</p>
                </div>
                <div className="overlay-answer">
                  <div className="answer-content markdown-body"><Markdown>{qa.answer}</Markdown></div>
                  <button className="copy-btn" title="Copy answer" onClick={() => { navigator.clipboard.writeText(qa.answer); useStore.getState().addToast('Copied!', 'success'); }}>📋</button>
                </div>
              </div>
            ))}

            {/* Render active generation */}
            {currentQuestion && (
              <div ref={answerStartRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="overlay-question animate-in">
                  <span className="q-marker">Q</span>
                  <p>{currentQuestion}</p>
                </div>
                
                {(currentAnswer || isGenerating) && (
                  <div className="overlay-answer animate-in">
                    <div className="answer-content markdown-body">
                      <Markdown>{currentAnswer}</Markdown>
                      {isGenerating && <span className="cursor">|</span>}
                    </div>
                    {!isGenerating && currentAnswer && (
                      <div className="answer-actions">
                        <button className="copy-btn visible" title="Copy answer" onClick={() => { navigator.clipboard.writeText(currentAnswer); useStore.getState().addToast('Copied!', 'success'); }}>📋</button>
                        <button className="copy-btn visible" title="Regenerate (Ctrl+Shift+R)" onClick={() => useStore.getState().regenerateAnswer()}>🔄</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual input */}
          <QuestionInput />

          {/* Audio Controls */}
          <div style={{ display: 'flex', gap: '8px', padding: '0 12px 12px 12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={toggleCapture}
                style={{
                  background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  color: isListening ? '#ef4444' : '#22c55e',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {isListening ? 'Stop listening' : 'Start listening'}
              </button>
              {isListening && (
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              )}
            </div>
            
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span title="Opacity">👁</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.05"
                  value={settings.overlayOpacity}
                  onChange={(e) => updateSettings({ overlayOpacity: parseFloat(e.target.value) })}
                  style={{ width: '60px', accentColor: '#a8a29e', cursor: 'pointer' }}
                />
              </div>
              <span><kbd style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 3px', borderRadius: '2px' }}>Ctrl+Shift+H</kbd> overlay</span>
            </div>
          </div>

          {/* Resize handle */}
          <div
            className="overlay-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX, startY = e.clientY;
              const startW = size.width, startH = size.height;
              const onMove = (ev) => setSize({
                width: Math.max(300, startW + ev.clientX - startX),
                height: Math.max(180, startH + ev.clientY - startY),
              });
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          />
        </>
      )}
    </div>
  );
}

function QuestionInput() {
  const [text, setText] = useState('');
  const { generateAnswer, isGenerating } = useStore();

  const submit = (e) => {
    e.preventDefault();
    if (text.trim() && !isGenerating) {
      generateAnswer(text.trim());
      setText('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <form className="overlay-input" onSubmit={submit}>
        <input
          type="text"
          placeholder="Type a question..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isGenerating}
        />
        <button type="submit" disabled={!text.trim() || isGenerating}>
          ↵
        </button>
      </form>
    </div>
  );
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}
