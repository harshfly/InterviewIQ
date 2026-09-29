import { useState, useRef } from 'react';
import useStore from '../../lib/store';
import api from '../../lib/api';
import './SessionSetup.css';

export default function SessionSetup() {
  const { createSession, sessionLoading, sessionError, addToast } = useStore();
  const [formData, setFormData] = useState({
    job_position: '',
    company: '',
    resume_text: '',
    job_description: '',
    custom_instructions: '',
    language: 'en',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleFile = (e) => {
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    e.preventDefault?.();
    setResumeFile(file);
    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = () => setFormData((prev) => ({ ...prev, resume_text: reader.result }));
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.job_position.trim() || !formData.company.trim()) {
      addToast('Job position and company are required.', 'error');
      return;
    }
    try {
      const session = await createSession(formData);
      if (resumeFile && session) {
        try {
          await api.uploadResume(session.session_id, resumeFile);
        } catch {
          addToast('Resume upload failed — session started without it.', 'warning');
        }
      }
    } catch {
      // handled by store
    }
  };

  const canSubmit = formData.job_position.trim() && formData.company.trim() && !sessionLoading;

  return (
    <div className="setup-page">
      <div className="setup-header animate-in-up">
        <h1>New session</h1>
        <p className="setup-subtitle">
          Enter the role and company you're interviewing for. The more context you provide, the better the answers.
        </p>
      </div>

      <form className="setup-form animate-in-up" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-row">
            <div className="input-group">
              <label className="input-label" htmlFor="job-position">
                Position <span className="required">*</span>
              </label>
              <input
                id="job-position"
                className="input"
                type="text"
                placeholder="Senior Backend Engineer"
                value={formData.job_position}
                onChange={handleChange('job_position')}
                required
                autoFocus
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="company">
                Company <span className="required">*</span>
              </label>
              <input
                id="company"
                className="input"
                type="text"
                placeholder="Stripe"
                value={formData.company}
                onChange={handleChange('company')}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Resume</label>
            <div
              className={`file-upload ${resumeFile ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
              onDrop={(e) => { e.currentTarget.classList.remove('dragging'); handleFile(e); }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
              {resumeFile ? (
                <div className="upload-done">
                  <span className="upload-filename">{resumeFile.name}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="upload-prompt">
                  <span className="upload-label">Drop a file here, or click to browse</span>
                  <span className="upload-hint">PDF, DOCX, or plain text</span>
                </div>
              )}
            </div>
          </div>

          {!resumeFile && (
            <div className="input-group">
              <label className="input-label" htmlFor="resume-text">Or paste experience summary</label>
              <textarea
                id="resume-text"
                className="input"
                placeholder="Key skills, years of experience, notable projects..."
                value={formData.resume_text}
                onChange={handleChange('resume_text')}
                rows={3}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          className="more-toggle"
          onClick={() => setShowMore(!showMore)}
        >
          {showMore ? 'Less options' : 'More options'}
        </button>

        {showMore && (
          <div className="form-section animate-in">
            <div className="input-group">
              <label className="input-label" htmlFor="job-description">Job description</label>
              <textarea
                id="job-description"
                className="input"
                placeholder="Paste the full job posting for more targeted answers..."
                value={formData.job_description}
                onChange={handleChange('job_description')}
                rows={3}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="custom-instructions">Custom instructions</label>
              <textarea
                id="custom-instructions"
                className="input"
                placeholder="Focus on Python and distributed systems. Emphasize leadership."
                value={formData.custom_instructions}
                onChange={handleChange('custom_instructions')}
                rows={2}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="language">Language</label>
              <select id="language" className="input" value={formData.language} onChange={handleChange('language')}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="hi">Hindi</option>
                <option value="pt">Portuguese</option>
                <option value="auto">Auto-detect</option>
              </select>
            </div>
          </div>
        )}

        {sessionError && (
          <div className="form-error animate-in">{sessionError}</div>
        )}

        <div className="form-actions">
          <button
            id="start-session"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!canSubmit}
          >
            {sessionLoading ? <><span className="spinner" /> Starting...</> : 'Start session'}
          </button>
        </div>
      </form>
    </div>
  );
}
