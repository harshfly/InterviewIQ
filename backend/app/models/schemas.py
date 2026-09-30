"""
InterviewIQ Pydantic Models
Data models for sessions, questions, and API requests/responses.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class QuestionType(str, Enum):
    BEHAVIORAL = "behavioral"
    TECHNICAL = "technical"
    CODING = "coding"
    SYSTEM_DESIGN = "system_design"
    CULTURE = "culture"
    OTHER = "other"


class Difficulty(str, Enum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    STAFF = "staff"


class SessionStatus(str, Enum):
    SETUP = "setup"
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


# ──────────────────────────────────────────────────────
# Request Models
# ──────────────────────────────────────────────────────


class CreateSessionRequest(BaseModel):
    """Request to create a new interview session."""
    job_position: str = Field(..., min_length=1, description="Target job position")
    company: str = Field(..., min_length=1, description="Target company name")
    resume_text: Optional[str] = Field(None, description="Resume content as text")
    job_description: Optional[str] = Field(None, description="Job description text")
    custom_instructions: Optional[str] = Field(None, description="Custom instructions for the AI")
    language: str = Field("en", description="Preferred language for answers")


class GenerateAnswerRequest(BaseModel):
    """Request to generate an answer for a question."""
    session_id: str
    question: str = Field(..., min_length=1)
    question_type: Optional[QuestionType] = None
    provider: Optional[str] = None


class TranscriptEntry(BaseModel):
    """A single transcript entry."""
    role: str  # "interviewer" or "candidate"
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CodingScreenshotRequest(BaseModel):
    """Request to analyze a coding problem screenshot."""
    session_id: str
    image_base64: str
    additional_context: Optional[str] = None


# ──────────────────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────────────────


class SessionResponse(BaseModel):
    """Response when a session is created."""
    session_id: str
    job_position: str
    company: str
    status: SessionStatus
    created_at: datetime


class QuestionClassification(BaseModel):
    """Classification result for a question."""
    type: QuestionType
    difficulty: Difficulty
    needs_resume: bool
    brief_topic: str


class QAPair(BaseModel):
    """A question-answer pair for history."""
    question: str
    answer: str
    question_type: QuestionType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    was_used: bool = False


class SessionDebrief(BaseModel):
    """Post-interview debrief."""
    score: int = Field(..., ge=1, le=10)
    strengths: list[str]
    improvements: list[str]
    key_moments: list[str]
    recommendations: list[str]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "1.0.0"
    providers: dict[str, bool] = {}
