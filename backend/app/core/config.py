"""
InterviewIQ Backend Configuration
Loads environment variables and provides typed settings.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # STT
    groq_api_key: str = ""
    deepgram_api_key: str = ""

    # LLM
    google_ai_api_key: str = ""
    openrouter_api_key: str = ""

    # Optional
    database_url: Optional[str] = None
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:1420"

    # Model preferences
    default_stt_provider: str = "deepgram"  # groq, deepgram, local
    default_llm_provider: str = "groq"  # groq, gemini, openrouter

    # Audio
    silence_threshold_ms: int = 1400
    chunk_duration_ms: int = 3000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
