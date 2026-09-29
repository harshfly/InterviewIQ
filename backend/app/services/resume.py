"""
InterviewIQ Resume Parser Service
Extracts text from uploaded resumes (PDF, DOCX, TXT).
"""

import logging
from io import BytesIO

logger = logging.getLogger(__name__)


async def parse_resume(file_content: bytes, filename: str) -> str:
    """Parse resume content from various file formats."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    try:
        if ext == "pdf":
            return _parse_pdf(file_content)
        elif ext in ("docx", "doc"):
            return _parse_docx(file_content)
        elif ext in ("txt", "md", "text"):
            return file_content.decode("utf-8", errors="ignore")
        else:
            # Try as plain text
            return file_content.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"Failed to parse resume ({filename}): {e}")
        raise ValueError(f"Could not parse resume file: {e}")


def _parse_pdf(content: bytes) -> str:
    """Extract text from PDF using PyPDF2."""
    from PyPDF2 import PdfReader

    reader = PdfReader(BytesIO(content))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)


def _parse_docx(content: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    from docx import Document

    doc = Document(BytesIO(content))
    text_parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            text_parts.append(para.text)
    return "\n".join(text_parts)
