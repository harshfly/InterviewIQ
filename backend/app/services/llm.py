"""
InterviewIQ LLM Service
Orchestrates the Loop Prompting Engine — classification, generation, refinement.
"""

import logging
from typing import AsyncGenerator

from app.core.model_router import model_router
from app.core.prompts import build_full_prompt, QUESTION_DETECTION_PROMPT
from app.services.session import session_manager

logger = logging.getLogger(__name__)


class LLMService:
    """Orchestrates the Loop Prompting Engine for answer generation."""

    async def is_question(self, text: str) -> bool:
        """Detect if a transcript segment is a complete interview question using fast heuristics."""
        text_lower = text.strip().lower().rstrip(".")
        if not text_lower or len(text_lower) < 2:
            return False
        
        # Reject common greetings and conversational noise
        noise_phrases = {
            "thank you", "thanks", "thank you so much", "okay thank you",
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
            "okay", "ok", "alright", "right", "sure", "yes", "no", "yeah",
            "got it", "i see", "understood", "perfect", "great", "nice",
            "let me", "one moment", "hold on", "hmm", "um", "uh",
            "can you hear me", "am i audible", "is my audio working",
            "let me share my screen", "one second",
        }
        if text_lower in noise_phrases:
            return False
        
        # Always accept explicit question marks
        if text_lower.rstrip(".").endswith("?"):
            return True
        
        # Question starters — accept even without question mark
        question_starters = [
            "what ", "how ", "why ", "when ", "where ", "who ", "which ",
            "can you ", "could you ", "would you ", "do you ", "are you ",
            "explain ", "describe ", "tell me ", "give me ", "define ",
            "what's ", "how's ", "why's ", "tell us ",
        ]
        if any(text_lower.startswith(q) for q in question_starters):
            return len(text_lower.split()) >= 3
        
        # For other text, need at least 3 meaningful words
        filler_words = {
            "okay", "ok", "yes", "no", "yeah", "yep", "right", "sure", "mhm",
            "uh", "um", "ah", "hmm", "cool", "nice", "wow", "so", "the", "a",
            "an", "is", "it", "and", "or", "but", "to", "of", "in", "on", "at",
            "for", "by", "i", "you", "he", "she", "we", "they", "that", "this",
            "like", "just", "also", "very", "then", "now", "here", "there",
            "thank", "thanks", "hello", "hi", "hey", "please",
        }
        words = [w for w in text_lower.split() if w.strip(".,!?") not in filler_words]
        
        # Need at least 2 meaningful words
        if len(words) >= 2:
            return True
        
        # Single meaningful word: only accept if 2+ chars (likely a topic like "api", "aws", "dom")
        if len(words) == 1:
            word = words[0].strip(".,!?")
            return len(word) >= 2
            
        return False

    async def generate_answer_stream(
        self,
        session_id: str,
        question: str,
        question_type: str | None = None,
        provider: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Full Loop Prompting Engine:
        1. Classify question
        2. Assemble context
        3. Generate streaming answer
        """
        session = session_manager.get_session(session_id)
        if not session:
            yield "Error: Session not found"
            return

        # Step 1: Classify the question (fast)
        if question_type is None:
            try:
                classification = await model_router.classify_question(question)
                question_type = classification.get("type", "other")
                logger.info(f"Classified as: {classification}")
            except Exception as e:
                logger.warning(f"Classification failed: {e}")
                question_type = "other"

        # Step 2: Assemble context
        resume_summary = session.get_resume_summary()
        recent_transcript = session.get_recent_transcript()

        # Step 3: Build prompt and generate
        messages = build_full_prompt(
            job_position=session.job_position,
            company=session.company,
            resume_summary=resume_summary,
            recent_transcript=recent_transcript,
            question=question,
            question_type=question_type,
        )

        # Add custom instructions if present
        if session.custom_instructions:
            messages[0]["content"] += f"\n\nADDITIONAL USER INSTRUCTIONS:\n{session.custom_instructions}"

        # Stream the answer
        full_answer = []
        async for chunk in model_router.generate_stream(messages, provider):
            full_answer.append(chunk)
            yield chunk

        # Record in session history
        answer_text = "".join(full_answer)
        session.add_transcript("interviewer", question)
        session.add_transcript("candidate", answer_text)
        session.add_qa_pair(question, answer_text, question_type)

    async def generate_debrief(self, session_id: str) -> str:
        """Generate a post-interview debrief."""
        from app.core.prompts import DEBRIEF_PROMPT

        session = session_manager.get_session(session_id)
        if not session:
            return "Session not found"

        qa_text = ""
        for i, qa in enumerate(session.qa_pairs, 1):
            qa_text += f"\nQ{i}: {qa.question}\nA{i}: {qa.answer}\n"

        if not qa_text:
            return "No questions were answered in this session."

        prompt = DEBRIEF_PROMPT.format(
            job_position=session.job_position,
            company=session.company,
            qa_pairs=qa_text,
        )

        messages = [{"role": "user", "content": prompt}]
        return await model_router.generate(messages)


# Singleton instance
llm_service = LLMService()
