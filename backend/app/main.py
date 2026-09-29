"""
InterviewIQ Backend — FastAPI Application
Main entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("🚀 InterviewIQ Backend starting...")
    logger.info(f"   Groq API: {'✅ configured' if settings.groq_api_key else '❌ not set'}")
    logger.info(f"   Gemini API: {'✅ configured' if settings.google_ai_api_key else '❌ not set'}")
    logger.info(f"   OpenRouter API: {'✅ configured' if settings.openrouter_api_key else '❌ not set'}")
    logger.info(f"   Deepgram API: {'✅ configured' if settings.deepgram_api_key else '❌ not set'}")
    yield
    logger.info("InterviewIQ Backend shutting down...")


app = FastAPI(
    title="InterviewIQ",
    description="Enterprise-Grade Real-Time AI Interview Copilot",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": "InterviewIQ",
        "version": "1.0.0",
        "docs": "/docs",
    }
