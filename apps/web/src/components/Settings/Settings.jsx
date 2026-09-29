import { useEffect } from 'react';
import useStore from '../../lib/store';
import './Settings.css';

export default function Settings() {
  const { settings, updateSettings, providers, fetchHealth, setView } = useStore();

  useEffect(() => { fetchHealth(); }, []);

  const providerList = [
    { key: 'groq', name: 'Groq', desc: 'Whisper STT + Llama 3.3 70B' },
    { key: 'gemini', name: 'Google Gemini', desc: 'Gemini 2.5 Flash — fallback + vision' },
    { key: 'openrouter', name: 'OpenRouter', desc: 'Multi-model fallback' },
    { key: 'deepgram', name: 'Deepgram', desc: 'Nova-2 streaming STT' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-top">
        <h1>Settings</h1>
        <button className="btn btn-secondary btn-sm" onClick={() => setView('setup')}>Back</button>
      </div>

      {/* Providers */}
      <section className="settings-section">
        <h2>Providers</h2>
        <p className="section-note">
          API keys are configured in your backend <code>.env</code> file.
        </p>
        <div className="provider-list">
          {providerList.map((p) => (
            <div key={p.key} className="provider-row">
              <div className="provider-info">
                <span className="provider-name">{p.name}</span>
                <span className="provider-desc">{p.desc}</span>
              </div>
              <span className={`provider-badge ${providers[p.key] ? 'provider-badge--on' : ''}`}>
                {providers[p.key] ? 'Connected' : 'Not configured'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Preferences */}
      <section className="settings-section">
        <h2>Preferences</h2>
        <div className="prefs-grid">
          <div className="input-group">
            <label className="input-label">STT provider</label>
            <select className="input" value={settings.sttProvider} onChange={(e) => updateSettings({ sttProvider: e.target.value })}>
              <option value="groq">Groq Whisper</option>
              <option value="deepgram">Deepgram Nova</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">LLM provider</label>
            <select className="input" value={settings.llmProvider} onChange={(e) => updateSettings({ llmProvider: e.target.value })}>
              <option value="groq">Groq — Llama 3.3 70B</option>
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Language</label>
            <select className="input" value={settings.language} onChange={(e) => updateSettings({ language: e.target.value })}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="hi">Hindi</option>
              <option value="auto">Auto-detect</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Overlay opacity</label>
            <div className="range-row">
              <input
                type="range" min="0.5" max="1" step="0.05"
                value={settings.overlayOpacity}
                onChange={(e) => updateSettings({ overlayOpacity: parseFloat(e.target.value) })}
              />
              <span className="range-val">{Math.round(settings.overlayOpacity * 100)}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hotkeys */}
      <section className="settings-section">
        <h2>Keyboard shortcuts</h2>
        <div className="shortcut-list">
          {Object.entries(settings.hotkeys).map(([action, key]) => (
            <div key={action} className="shortcut-row">
              <span className="shortcut-action">
                {action.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </span>
              <kbd>{key}</kbd>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="settings-section">
        <h2>About</h2>
        <div className="about-box">
          <p>InterviewIQ v1.0.0</p>
          <p className="about-desc">Real-time interview assistant for professionals.</p>
          <p className="about-warning">
            Use of real-time AI assistance may violate some employers' interview policies. Use responsibly.
          </p>
        </div>
      </section>
    </div>
  );
}
