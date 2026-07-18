"""Chat provider abstraction. Selection happens only via config — never in code."""

from typing import Protocol

import httpx
from pydantic import BaseModel

from app.config import Settings
from app.providers.errors import ProviderNotConfiguredError


class ChatMessage(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str


class ChatProvider(Protocol):
    model: str

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        format_json: bool = False,
    ) -> str:
        """Return the assistant's reply. `format_json` constrains output to valid
        JSON where the provider supports it (used by the LLM-judge)."""
        ...


class OllamaChat:
    def __init__(self, base_url: str, model: str, temperature: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.temperature = temperature

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        format_json: bool = False,
    ) -> str:
        payload: dict[str, object] = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "stream": False,
            "options": {
                "temperature": self.temperature if temperature is None else temperature
            },
        }
        if format_json:
            payload["format"] = "json"
        async with httpx.AsyncClient(base_url=self.base_url, timeout=120.0) as client:
            response = await client.post("/api/chat", json=payload)
            response.raise_for_status()
            content: str = response.json()["message"]["content"]
            return content


class OpenAIChat:
    """Stub — wire when an operator sets LLM_PROVIDER=openai (env swap, zero code change here)."""

    def __init__(self, model: str, temperature: float) -> None:
        self.model = model
        self.temperature = temperature

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        format_json: bool = False,
    ) -> str:
        raise NotImplementedError(
            "openai chat provider is a stub — use LLM_PROVIDER=ollama for local dev"
        )


class AnthropicChat:
    """Stub — wire when an operator sets LLM_PROVIDER=anthropic."""

    def __init__(self, model: str, temperature: float) -> None:
        self.model = model
        self.temperature = temperature

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float | None = None,
        format_json: bool = False,
    ) -> str:
        raise NotImplementedError(
            "anthropic chat provider is a stub — use LLM_PROVIDER=ollama for local dev"
        )


def get_chat_provider(settings: Settings) -> ChatProvider:
    if not settings.llm_configured:
        raise ProviderNotConfiguredError("LLM_MODEL not configured")
    if settings.llm_provider == "ollama":
        return OllamaChat(settings.ollama_base_url, settings.llm_model, settings.llm_temperature)
    if settings.llm_provider == "openai":
        return OpenAIChat(settings.llm_model, settings.llm_temperature)
    return AnthropicChat(settings.llm_model, settings.llm_temperature)
