/**
 * InterviewIQ API Client
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class APIClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  async _fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res;
  }

  // ── Health ──
  async health() {
    const res = await this._fetch('/health');
    return res.json();
  }

  // ── Sessions ──
  async createSession(data) {
    const res = await this._fetch('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async listSessions() {
    const res = await this._fetch('/sessions');
    return res.json();
  }

  async getSession(id) {
    const res = await this._fetch(`/sessions/${id}`);
    return res.json();
  }

  async endSession(id) {
    const res = await this._fetch(`/sessions/${id}/end`, { method: 'POST' });
    return res.json();
  }

  async deleteSession(id) {
    const res = await this._fetch(`/sessions/${id}`, { method: 'DELETE' });
    return res.json();
  }

  // ── Resume Upload ──
  async uploadResume(sessionId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${this.baseUrl}/sessions/${sessionId}/resume`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Resume upload failed');
    return res.json();
  }

  // ── Generate Answer (Streaming) ──
  async *generateAnswer(sessionId, question, questionType = null, provider = null) {
    const res = await this._fetch('/generate', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        question,
        question_type: questionType,
        provider,
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            yield parsed.text;
          } catch (e) {
            // Skip non-JSON data
          }
        }
      }
    }
  }

  // ── Transcribe Audio ──
  async transcribeAudio(audioBlob, language = 'en') {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('language', language);

    const res = await fetch(`${this.baseUrl}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Transcription failed');
    return res.json();
  }

  // ── Question Detection ──
  async detectQuestion(text) {
    const res = await this._fetch('/detect-question', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return res.json();
  }

  // ── History ──
  async getSessionHistory(sessionId) {
    const res = await this._fetch(`/sessions/${sessionId}/history`);
    return res.json();
  }

  // ── Debrief ──
  async generateDebrief(sessionId) {
    const res = await this._fetch(`/sessions/${sessionId}/debrief`, {
      method: 'POST',
    });
    return res.json();
  }

  // ── WebSocket ──
  createWebSocket(sessionId) {
    const wsBase = this.baseUrl.replace(/^http/, 'ws');
    return new WebSocket(`${wsBase}/ws/${sessionId}`);
  }
}

export const api = new APIClient();
export default api;
