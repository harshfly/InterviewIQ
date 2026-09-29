"""
InterviewIQ Model Router
Routes LLM requests through Groq → Gemini → OpenRouter with automatic fallback.
All responses are streamed.
"""

import json
import logging
import warnings
from typing import AsyncGenerator

warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
from groq import AsyncGroq
import google.generativeai as genai
from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class ModelRouter:
    """Routes LLM requests with automatic fallback: Groq → Gemini → OpenRouter."""

    def __init__(self):
        self._groq_client = None
        self._gemini_model = None
        self._openrouter_client = None

    @property
    def groq_client(self) -> AsyncGroq | None:
        if self._groq_client is None and settings.groq_api_key:
            self._groq_client = AsyncGroq(api_key=settings.groq_api_key)
        return self._groq_client

    @property
    def gemini_model(self):
        if self._gemini_model is None and settings.google_ai_api_key:
            genai.configure(api_key=settings.google_ai_api_key)
            self._gemini_model = genai.GenerativeModel("gemini-3.8-flash")
        return self._gemini_model

    @property
    def openrouter_client(self) -> AsyncOpenAI | None:
        if self._openrouter_client is None and settings.openrouter_api_key:
            self._openrouter_client = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.openrouter_api_key,
            )
        return self._openrouter_client

    async def generate_stream(
        self, messages: list[dict], provider: str | None = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming response, falling back through providers.
        Yields text chunks.
        """
        providers = self._get_provider_order(provider)

        for prov in providers:
            try:
                logger.info(f"Attempting generation with provider: {prov}")
                async for chunk in self._call_provider(prov, messages):
                    yield chunk
                return  # Success — stop trying other providers
            except Exception as e:
                logger.warning(f"Provider {prov} failed: {e}")
                continue

        # All providers failed
        yield "I'm having trouble generating a response right now. Please check your API keys and try again."

    async def generate(self, messages: list[dict], provider: str | None = None) -> str:
        """Generate a non-streaming response (used for classification, etc.)."""
        result = []
        async for chunk in self.generate_stream(messages, provider):
            result.append(chunk)
        return "".join(result)

    async def classify_question(self, question: str) -> dict:
        """Classify a question type using a fast model. Returns classification dict."""
        from app.core.prompts import CLASSIFICATION_PROMPT

        prompt = CLASSIFICATION_PROMPT.format(question=question)
        messages = [{"role": "user", "content": prompt}]

        response = await self.generate(messages)

        try:
            # Extract JSON from response
            response = response.strip()
            if response.startswith("```"):
                response = response.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(response)
        except (json.JSONDecodeError, IndexError):
            logger.warning(f"Failed to parse classification: {response}")
            return {
                "type": "other",
                "difficulty": "mid",
                "needs_resume": False,
                "brief_topic": "general",
            }

    def _get_provider_order(self, preferred: str | None = None) -> list[str]:
        """Get ordered list of providers to try. Groq first (fastest), then OpenRouter, then Gemini."""
        all_providers = []

        # Groq first — fastest inference
        if settings.groq_api_key:
            all_providers.append("groq")
        if settings.openrouter_api_key:
            all_providers.append("openrouter")
        if settings.google_ai_api_key:
            all_providers.append("gemini")

        if preferred and preferred in all_providers:
            all_providers.remove(preferred)
            all_providers.insert(0, preferred)

        return all_providers

    async def _call_provider(
        self, provider: str, messages: list[dict]
    ) -> AsyncGenerator[str, None]:
        """Call a specific provider and yield streaming chunks."""
        if provider == "groq":
            async for chunk in self._call_groq(messages):
                yield chunk
        elif provider == "gemini":
            async for chunk in self._call_gemini(messages):
                yield chunk
        elif provider == "openrouter":
            async for chunk in self._call_openrouter(messages):
                yield chunk
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def _call_groq(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """Stream from Groq (Llama 3.3 70B)."""
        client = self.groq_client
        if not client:
            raise RuntimeError("Groq client not configured")

        stream = await client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=1024,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    async def _call_gemini(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """Stream from Google Gemini."""
        model = self.gemini_model
        if not model:
            raise RuntimeError("Gemini model not configured")

        # Convert messages to Gemini format
        prompt_parts = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt_parts.append(f"System Instructions:\n{content}\n")
            else:
                prompt_parts.append(content)

        full_prompt = "\n\n".join(prompt_parts)

        response = await model.generate_content_async(
            full_prompt,
            stream=True,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text

    async def _call_openrouter(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """Stream from OpenRouter (best available free model)."""
        client = self.openrouter_client
        if not client:
            raise RuntimeError("OpenRouter client not configured")

        stream = await client.chat.completions.create(
            model="qwen/qwen3.7-plus",
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=1024,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content


# Singleton instance
model_router = ModelRouter()
