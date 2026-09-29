"""
InterviewIQ STT Service
Speech-to-Text processing using Groq Whisper, Deepgram, or local Whisper.
"""

import logging
import tempfile
import os
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class STTService:
    """Speech-to-Text service with provider fallback."""

    def __init__(self):
        self._groq_client = None

    @property
    def groq_client(self):
        if self._groq_client is None and settings.groq_api_key:
            from groq import Groq
            self._groq_client = Groq(api_key=settings.groq_api_key)
        return self._groq_client

    async def transcribe(
        self, audio_data: bytes, language: str = "en", provider: Optional[str] = None
    ) -> str:
        """Transcribe audio data to text."""
        prov = provider or settings.default_stt_provider

        try:
            if prov == "groq":
                return await self._transcribe_groq(audio_data, language)
            elif prov == "deepgram":
                return await self._transcribe_deepgram(audio_data, language)
            else:
                raise ValueError(f"Unknown STT provider: {prov}")
        except Exception as e:
            logger.warning(f"STT provider {prov} failed: {e}")
            # Try fallback
            if prov != "groq" and settings.groq_api_key:
                try:
                    return await self._transcribe_groq(audio_data, language)
                except Exception:
                    pass
            raise

    async def _transcribe_groq(self, audio_data: bytes, language: str) -> str:
        """Transcribe using Groq Whisper."""
        client = self.groq_client
        if not client:
            raise RuntimeError("Groq STT not configured — set GROQ_API_KEY")

        # Write audio to temp file (Groq SDK needs a file)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as f:
                transcription = client.audio.transcriptions.create(
                    file=f,
                    model="whisper-large-v3",
                    language=language if language != "auto" else None,
                    response_format="text",
                )
            return transcription.strip()
        finally:
            os.unlink(tmp_path)

    async def _transcribe_deepgram(self, audio_data: bytes, language: str) -> str:
        """Transcribe using Deepgram Nova."""
        import httpx

        if not settings.deepgram_api_key:
            raise RuntimeError("Deepgram not configured — set DEEPGRAM_API_KEY")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepgram.com/v1/listen",
                headers={
                    "Authorization": f"Token {settings.deepgram_api_key}",
                    "Content-Type": "audio/webm",
                },
                params={
                    "model": "nova-2",
                    "language": language if language != "auto" else "en",
                    "smart_format": "true",
                    "punctuate": "true",
                    "utterances": "true",
                },
                content=audio_data,
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["results"]["channels"][0]["alternatives"][0]["transcript"]


# Singleton instance
stt_service = STTService()
