/**
 * InterviewIQ Zustand Store
 * Global state management for the entire app.
 */

import { create } from 'zustand';
import api from '../lib/api';

export const useStore = create((set, get) => ({
  // ── View State ──
  currentView: 'setup', // 'setup' | 'live' | 'history' | 'settings'
  setView: (view) => set({ currentView: view }),

  // ── Session ──
  session: null,
  sessionLoading: false,
  sessionError: null,

  createSession: async (data) => {
    set({ sessionLoading: true, sessionError: null });
    try {
      const session = await api.createSession(data);
      set({ session, sessionLoading: false, currentView: 'live' });
      return session;
    } catch (error) {
      set({ sessionError: error.message, sessionLoading: false });
      throw error;
    }
  },

  endSession: async () => {
    const { session } = get();
    if (!session) return;
    try {
      await api.endSession(session.session_id);
      set({ currentView: 'setup' });
    } catch (e) {
      console.error('Failed to end session:', e);
    }
  },

  // ── Audio State ──
  isListening: false,
  isPaused: false,
  audioStatus: 'idle', // 'idle' | 'listening' | 'generating' | 'paused'

  setIsListening: (val) => set({ isListening: val, audioStatus: val ? 'listening' : 'idle' }),
  setIsPaused: (val) => set({ isPaused: val, audioStatus: val ? 'paused' : 'listening' }),
  setAudioStatus: (status) => set({ audioStatus: status }),

  // ── Transcript ──
  transcriptBuffer: '',
  fullTranscript: [],

  appendTranscript: (text) => set((state) => ({
    transcriptBuffer: state.transcriptBuffer + ' ' + text,
    fullTranscript: [...state.fullTranscript, { role: 'interviewer', text, timestamp: new Date() }],
  })),

  clearTranscriptBuffer: () => set({ transcriptBuffer: '' }),

  // ── Current Answer ──
  currentQuestion: '',
  currentAnswer: '',
  isGenerating: false,
  questionType: null,
  provider: 'openrouter',
  setProvider: (provider) => set({ provider }),

  generateAnswer: async (question, provider = null) => {
    const { session } = get();
    if (!session) return;

    set({
      currentQuestion: question,
      currentAnswer: '',
      isGenerating: true,
      audioStatus: 'generating',
      questionType: null,
    });

    try {
      let answer = '';
      for await (const chunk of api.generateAnswer(session.session_id, question, null, provider)) {
        answer += chunk;
        set({ currentAnswer: answer });
      }
      // Save to history so old Q&A persists on the overlay
      get().addToHistory(question, answer, null);
    } catch (e) {
      set({ currentAnswer: `Error: ${e.message}` });
    } finally {
      set({
        isGenerating: false,
        audioStatus: 'listening',
        currentQuestion: '',
        currentAnswer: '',
      });
    }
  },

  // ── QA History ──
  qaHistory: [],
  addToHistory: (question, answer, type) => set((state) => ({
    qaHistory: [...state.qaHistory, { question, answer, type, timestamp: new Date(), wasUsed: false }],
  })),

  // ── Settings ──
  settings: {
    backendUrl: 'http://localhost:8000',
    sttProvider: 'groq',
    llmProvider: 'groq',
    language: 'en',
    overlayOpacity: 0.45,
    overlayPosition: { x: 100, y: 100 },
    hotkeys: {
      toggleOverlay: 'Ctrl+Shift+H',
      regenerate: 'Ctrl+Shift+R',
      pause: 'Ctrl+Shift+P',
    },
  },

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),

  // ── Toasts ──
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  // ── Providers Health ──
  providers: {},
  fetchHealth: async () => {
    try {
      const health = await api.health();
      set({ providers: health.providers });
    } catch {
      // Backend not running yet — fail silently
    }
  },
}));

export default useStore;
