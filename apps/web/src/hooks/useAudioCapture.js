/**
 * useAudioCapture Hook
 * Real-time WebSocket streaming STT via backend proxy to Deepgram.
 * Audio flows continuously — no chunked uploads, zero gaps.
 */

import { useCallback, useRef, useState } from 'react';
import api from '../lib/api';
import useStore from '../lib/store';

// Convert Float32 PCM to 16-bit PCM (Deepgram's preferred format)
function float32ToInt16(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16.buffer;
}

export function useAudioCapture() {
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const [error, setError] = useState(null);

  const {
    setIsListening,
    appendTranscript,
    clearTranscriptBuffer,
    generateAnswer,
    addToast,
    settings,
  } = useStore();

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      const audioSource = useStore.getState().settings.audioSource || 'both';
      let stream = null;

      if (audioSource === 'system') {
        // ── System/Tab Audio ONLY — capture Meet/Zoom/Teams audio, no mic ──
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
          // Kill the video track — we only want audio
          displayStream.getVideoTracks().forEach((t) => t.stop());

          const systemAudioTrack = displayStream.getAudioTracks()[0];
          if (!systemAudioTrack) {
            throw new Error('No audio track found. Make sure to select a tab with audio.');
          }
          stream = new MediaStream([systemAudioTrack]);
          addToast('Capturing system/tab audio only (no mic)', 'success');
        } catch (e) {
          setError('Failed to capture system audio. Please share a tab with audio enabled.');
          addToast('System audio capture failed', 'error');
          return;
        }
      } else if (audioSource === 'mic') {
        // ── Mic ONLY — capture local microphone only ──
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });
        addToast('Capturing microphone only', 'success');
      } else {
        // ── BOTH — mix mic + system audio together ──
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });
        stream = micStream;

        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
          displayStream.getVideoTracks().forEach((t) => t.stop());

          const systemAudioTrack = displayStream.getAudioTracks()[0];
          if (systemAudioTrack) {
            const ctx = new AudioContext({ sampleRate: 16000 });
            const micSource = ctx.createMediaStreamSource(micStream);
            const sysSource = ctx.createMediaStreamSource(new MediaStream([systemAudioTrack]));
            const dest = ctx.createMediaStreamDestination();
            micSource.connect(dest);
            sysSource.connect(dest);
            stream = dest.stream;
            addToast('Capturing mic + system audio', 'success');
          } else {
            addToast('Mic only — tab had no audio track', 'info');
          }
        } catch {
          // User declined screen share — mic only
          addToast('Mic only (screen share declined)', 'info');
        }
      }

      streamRef.current = stream;

      // ── Open WebSocket to backend STT proxy ──
      const wsBase = (settings.backendUrl || 'http://localhost:8000').replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsBase}/api/ws/stt?language=${settings.language || 'en'}`);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[STT WS] Connected');

        // ── Set up AudioWorklet or ScriptProcessor to stream raw PCM ──
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        // Use ScriptProcessor (widely supported) to capture raw audio
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const pcmData = e.inputBuffer.getChannelData(0);
            const int16Data = float32ToInt16(pcmData);
            ws.send(int16Data);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'transcript' && msg.text) {
            appendTranscript(msg.text);

            // Reset silence timer on each transcript
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }

            silenceTimerRef.current = setTimeout(async () => {
              const buffer = useStore.getState().transcriptBuffer.trim();
              if (buffer.length >= 2) {
                try {
                  const detection = await api.detectQuestion(buffer);
                  if (detection.is_question) {
                    generateAnswer(buffer);
                    clearTranscriptBuffer();
                  }
                } catch (err) {
                  console.error('Question detection failed:', err);
                }
              }
            }, 2000);
          } else if (msg.type === 'error') {
            console.error('[STT WS] Error:', msg.message);
          }
        } catch {
          // Non-JSON message, ignore
        }
      };

      ws.onerror = (e) => {
        console.error('[STT WS] Error:', e);
        setError('WebSocket STT connection error');
      };

      ws.onclose = (e) => {
        console.log('[STT WS] Closed:', e.code, e.reason);
        // If unexpected close while still listening, fall back to REST polling
        if (useStore.getState().isListening) {
          addToast('WebSocket disconnected, falling back to REST', 'warning');
          fallbackToRest();
        }
      };

      setIsListening(true);
      addToast('Real-time streaming started', 'success');
    } catch (e) {
      setError(e.message);
      addToast(`Audio capture failed: ${e.message}`, 'error');
    }
  }, [settings.language, settings.audioSource]);

  // Fallback: if WebSocket fails, use the old chunked REST approach
  const fallbackToRest = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        try {
          const result = await api.transcribeAudio(event.data, settings.language);
          if (result.text && result.text.trim()) {
            appendTranscript(result.text.trim());

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(async () => {
              const buffer = useStore.getState().transcriptBuffer.trim();
              if (buffer.length > 5) {
                try {
                  const detection = await api.detectQuestion(buffer);
                  if (detection.is_question) {
                    generateAnswer(buffer);
                    clearTranscriptBuffer();
                  }
                } catch {}
              }
            }, 2000);
          }
        } catch {}
      }
    };

    mediaRecorder.start(4000); // Record in 4s chunks
  }, [settings.language]);

  const stopCapture = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop AudioContext processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    setIsListening(false);
  }, []);

  const toggleCapture = useCallback(() => {
    if (useStore.getState().isListening) {
      stopCapture();
    } else {
      startCapture();
    }
  }, [startCapture, stopCapture]);

  return {
    startCapture,
    stopCapture,
    toggleCapture,
    error,
  };
}

export default useAudioCapture;
