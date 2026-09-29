"""
InterviewIQ Session Service
Manages interview sessions, transcript history, and context.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional

from app.models.schemas import (
    CreateSessionRequest,
    SessionResponse,
    SessionStatus,
    QAPair,
    QuestionType,
    TranscriptEntry,
)

logger = logging.getLogger(__name__)


class Session:
    """Represents a single interview session."""

    def __init__(self, request: CreateSessionRequest):
        self.id = str(uuid.uuid4())
        self.job_position = request.job_position
        self.company = request.company
        self.resume_text = request.resume_text or ""
        self.job_description = request.job_description or ""
        self.custom_instructions = request.custom_instructions or ""
        self.language = request.language
        self.status = SessionStatus.ACTIVE
        self.created_at = datetime.utcnow()
        self.transcript: list[TranscriptEntry] = []
        self.qa_pairs: list[QAPair] = []

    def add_transcript(self, role: str, text: str):
        """Add a transcript entry."""
        self.transcript.append(
            TranscriptEntry(role=role, text=text, timestamp=datetime.utcnow())
        )

    def add_qa_pair(self, question: str, answer: str, question_type: str):
        """Record a question-answer pair."""
        self.qa_pairs.append(
            QAPair(
                question=question,
                answer=answer,
                question_type=QuestionType(question_type) if question_type in QuestionType.__members__.values() else QuestionType.OTHER,
                timestamp=datetime.utcnow(),
            )
        )

    def get_recent_transcript(self, max_turns: int = 6) -> str:
        """Get recent transcript entries as formatted text."""
        recent = self.transcript[-max_turns:] if self.transcript else []
        if not recent:
            return "No prior conversation"

        lines = []
        for entry in recent:
            role = "Interviewer" if entry.role == "interviewer" else "Candidate"
            lines.append(f"{role}: {entry.text}")
        return "\n".join(lines)

    def get_resume_summary(self) -> str:
        """Get resume text (could be enhanced with summarization)."""
        if self.resume_text:
            # Truncate to reasonable context length
            return self.resume_text[:3000]
        return "No resume provided"

    def to_response(self) -> SessionResponse:
        """Convert to API response."""
        return SessionResponse(
            session_id=self.id,
            job_position=self.job_position,
            company=self.company,
            status=self.status,
            created_at=self.created_at,
        )


class SessionManager:
    """Manages all active sessions (in-memory for v1)."""

    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def create_session(self, request: CreateSessionRequest) -> Session:
        """Create and store a new session."""
        session = Session(request)
        self._sessions[session.id] = session
        logger.info(f"Created session {session.id} for {request.job_position} at {request.company}")
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Retrieve a session by ID."""
        return self._sessions.get(session_id)

    def end_session(self, session_id: str) -> Optional[Session]:
        """End a session."""
        session = self._sessions.get(session_id)
        if session:
            session.status = SessionStatus.ENDED
        return session

    def list_sessions(self) -> list[SessionResponse]:
        """List all sessions."""
        return [s.to_response() for s in self._sessions.values()]

    def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False


# Singleton instance
session_manager = SessionManager()
