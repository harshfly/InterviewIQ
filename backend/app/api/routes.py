"""
InterviewIQ API Routes
REST + WebSocket endpoints for the interview copilot.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    CreateSessionRequest,
    GenerateAnswerRequest,
    SessionResponse,
    HealthResponse,
)
from app.services.session import session_manager
from app.services.llm import llm_service
from app.services.stt import stt_service
from app.services.resume import parse_resume
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ──────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API health and available providers."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        providers={
            "groq": bool(settings.groq_api_key),
            "gemini": bool(settings.google_ai_api_key),
            "openrouter": bool(settings.openrouter_api_key),
            "deepgram": bool(settings.deepgram_api_key),
        },
    )


# ──────────────────────────────────────────────────────
# Sessions
# ──────────────────────────────────────────────────────


@router.post("/sessions", response_model=SessionResponse)
async def create_session(request: CreateSessionRequest):
    """Create a new interview session. Job position and company are mandatory."""
    session = session_manager.create_session(request)
    return session.to_response()


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions():
    """List all sessions."""
    return session_manager.list_sessions()


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """Get a specific session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.to_response()


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    """End a session."""
    session = session_manager.end_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ended", "session_id": session_id}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if not session_manager.delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted"}


# ──────────────────────────────────────────────────────
# Resume Upload
# ──────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/resume")
async def upload_resume(session_id: str, file: UploadFile = File(...)):
    """Upload a resume file to a session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    content = await file.read()
    text = await parse_resume(content, file.filename or "resume.txt")
    session.resume_text = text
    return {"status": "uploaded", "characters": len(text)}


# ──────────────────────────────────────────────────────
# Answer Generation (Streaming HTTP)
# ──────────────────────────────────────────────────────


@router.post("/generate")
async def generate_answer(request: GenerateAnswerRequest):
    """Generate a streaming answer for an interview question."""
    session = session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def stream():
        async for chunk in llm_service.generate_answer_stream(
            session_id=request.session_id,
            question=request.question,
            question_type=request.question_type,
            provider=request.provider,
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ──────────────────────────────────────────────────────
# Speech-to-Text
# ──────────────────────────────────────────────────────


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    provider: Optional[str] = Form(None),
):
    """Transcribe an audio chunk to text."""
    audio_data = await audio.read()
    text = await stt_service.transcribe(audio_data, language, provider)
    return {"text": text}


# ──────────────────────────────────────────────────────
# WebSocket STT Streaming (Deepgram Real-Time)
# ──────────────────────────────────────────────────────


@router.websocket("/ws/stt")
async def websocket_stt(websocket: WebSocket, language: str = "en"):
    """
    Real-time WebSocket STT streaming via Deepgram.

    Client sends: raw 16-bit PCM audio frames (binary)
    Server sends: {"type": "transcript", "text": "...", "is_final": bool}
    """
    import asyncio
    import websockets

    if not settings.deepgram_api_key:
        await websocket.close(code=4001, reason="Deepgram API key not configured")
        return

    await websocket.accept()
    logger.info("WebSocket STT streaming session started")

    # Build Deepgram WebSocket URL
    dg_url = (
        f"wss://api.deepgram.com/v1/listen"
        f"?encoding=linear16&sample_rate=16000&channels=1"
        f"&model=nova-2&language={language}"
        f"&punctuate=true&smart_format=true&interim_results=true"
        f"&utterance_end_ms=1500&vad_events=true"
        f"&keywords=React:5&keywords=JavaScript:5&keywords=TypeScript:5"
        f"&keywords=Python:5&keywords=hooks:5&keywords=API:5"
        f"&keywords=Node.js:5&keywords=Docker:5&keywords=Kubernetes:5"
        f"&keywords=SQL:5&keywords=MongoDB:5&keywords=GraphQL:5"
        f"&keywords=Redux:5&keywords=Next.js:5&keywords=Angular:5"
        f"&keywords=Vue:5&keywords=AWS:5&keywords=Azure:5"
    )

    dg_headers = {
        "Authorization": f"Token {settings.deepgram_api_key}",
    }

    dg_ws = None

    try:
        # Connect to Deepgram's WebSocket
        dg_ws = await websockets.connect(dg_url, additional_headers=dg_headers)
        logger.info("Connected to Deepgram real-time API")

        # Task: Forward Deepgram transcripts → browser
        async def dg_to_client():
            try:
                async for message in dg_ws:
                    data = json.loads(message)

                    # Handle speech-to-text results
                    if data.get("type") == "Results":
                        channel = data.get("channel", {})
                        alternatives = channel.get("alternatives", [{}])
                        transcript = alternatives[0].get("transcript", "")
                        is_final = data.get("is_final", False)

                        if transcript.strip() and is_final:
                            await websocket.send_json({
                                "type": "transcript",
                                "text": transcript.strip(),
                                "is_final": is_final,
                            })

                    # Handle utterance end (speaker paused)
                    elif data.get("type") == "UtteranceEnd":
                        await websocket.send_json({
                            "type": "utterance_end",
                        })

            except websockets.exceptions.ConnectionClosed:
                logger.info("Deepgram WebSocket closed")
            except Exception as e:
                logger.error(f"Deepgram listener error: {e}")
                try:
                    await websocket.send_json({"type": "error", "message": str(e)})
                except Exception:
                    pass

        # Task: Forward browser audio → Deepgram
        async def client_to_dg():
            try:
                while True:
                    data = await websocket.receive_bytes()
                    if dg_ws:
                        await dg_ws.send(data)
            except WebSocketDisconnect:
                logger.info("Client disconnected from STT WebSocket")
            except Exception as e:
                logger.error(f"Client audio forwarding error: {e}")

        # Run both tasks concurrently
        await asyncio.gather(dg_to_client(), client_to_dg())

    except Exception as e:
        logger.error(f"STT WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        if dg_ws:
            await dg_ws.close()
        logger.info("WebSocket STT streaming session ended")


# ──────────────────────────────────────────────────────
# Question Detection
# ──────────────────────────────────────────────────────


@router.post("/detect-question")
async def detect_question(payload: dict):
    """Detect if a transcript segment is a complete interview question."""
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    is_q = await llm_service.is_question(text)
    return {"is_question": is_q, "text": text}


# ──────────────────────────────────────────────────────
# Session History & Debrief
# ──────────────────────────────────────────────────────


@router.get("/sessions/{session_id}/history")
async def get_session_history(session_id: str):
    """Get the Q&A history for a session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "qa_pairs": [qa.model_dump() for qa in session.qa_pairs],
        "transcript": [t.model_dump() for t in session.transcript],
    }


@router.post("/sessions/{session_id}/debrief")
async def generate_debrief(session_id: str):
    """Generate a post-interview AI debrief."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    debrief = await llm_service.generate_debrief(session_id)
    return {"session_id": session_id, "debrief": debrief}


# ──────────────────────────────────────────────────────
# WebSocket (Real-time audio + answers)
# ──────────────────────────────────────────────────────


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Real-time WebSocket for audio streaming and answer generation.

    Client sends:
      - {"type": "audio", "data": "<base64 audio>"} — audio chunks for STT
      - {"type": "question", "text": "..."} — manual question submission
      - {"type": "transcript", "text": "...", "role": "interviewer|candidate"} — add transcript

    Server sends:
      - {"type": "transcript", "text": "..."} — real-time STT transcript
      - {"type": "answer_start"} — answer generation started
      - {"type": "answer_chunk", "text": "..."} — streamed answer chunk
      - {"type": "answer_done"} — answer generation complete
      - {"type": "classification", "data": {...}} — question classification
      - {"type": "error", "message": "..."} — error message
    """
    session = session_manager.get_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    await websocket.accept()
    logger.info(f"WebSocket connected for session {session_id}")

    transcript_buffer = ""

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "audio":
                # Decode and transcribe audio chunk
                import base64
                try:
                    audio_bytes = base64.b64decode(data["data"])
                    text = await stt_service.transcribe(audio_bytes, session.language)

                    if text.strip():
                        transcript_buffer += " " + text
                        await websocket.send_json({
                            "type": "transcript",
                            "text": text,
                            "full_buffer": transcript_buffer.strip(),
                        })

                        # Check if it's a complete question
                        is_q = await llm_service.is_question(transcript_buffer.strip())
                        if is_q:
                            question = transcript_buffer.strip()
                            transcript_buffer = ""

                            # Generate answer
                            await websocket.send_json({"type": "answer_start"})
                            async for chunk in llm_service.generate_answer_stream(
                                session_id=session_id,
                                question=question,
                            ):
                                await websocket.send_json({
                                    "type": "answer_chunk",
                                    "text": chunk,
                                })
                            await websocket.send_json({"type": "answer_done"})

                except Exception as e:
                    logger.error(f"Audio processing error: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Audio processing failed: {str(e)}",
                    })

            elif msg_type == "question":
                # Manual question submission
                question = data.get("text", "")
                if question:
                    await websocket.send_json({"type": "answer_start"})

                    # Classify first
                    try:
                        classification = await model_router.classify_question(question)
                        await websocket.send_json({
                            "type": "classification",
                            "data": classification,
                        })
                    except Exception:
                        classification = None

                    async for chunk in llm_service.generate_answer_stream(
                        session_id=session_id,
                        question=question,
                        question_type=classification.get("type") if classification else None,
                    ):
                        await websocket.send_json({
                            "type": "answer_chunk",
                            "text": chunk,
                        })
                    await websocket.send_json({"type": "answer_done"})

            elif msg_type == "transcript":
                # Manual transcript addition
                session.add_transcript(
                    role=data.get("role", "interviewer"),
                    text=data.get("text", ""),
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


# Need to import model_router for websocket handler
from app.core.model_router import model_router
