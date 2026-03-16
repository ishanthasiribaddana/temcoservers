import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from db import get_session, AiUsage
from datetime import datetime
import httpx

app = FastAPI(
    title="TemcoServers AI Module",
    description="AI Code Generation Module for TemcoServers Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodeRequest(BaseModel):
    prompt: str
    language: Optional[str] = "python"
    model: Optional[str] = "deepseek"
    conversation_id: Optional[int] = None
    gup_id: Optional[int] = None


class CodeResponse(BaseModel):
    response: str
    model_used: str
    tokens_used: int
    conversation_id: Optional[int] = None


@app.get("/health")
def health():
    return {"status": "UP", "service": "TemcoServers AI Module", "version": "1.0.0"}


@app.post("/api/ai/generate", response_model=CodeResponse)
async def generate_code(request: CodeRequest):
    """Generate code using AI models (DeepSeek or OpenAI)."""

    deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")

    model_used = request.model
    if model_used == "deepseek" and deepseek_key:
        response_text, tokens = await _call_deepseek(request.prompt, request.language, deepseek_key)
    elif model_used == "openai" and openai_key:
        response_text, tokens = await _call_openai(request.prompt, request.language, openai_key)
    elif deepseek_key:
        response_text, tokens = await _call_deepseek(request.prompt, request.language, deepseek_key)
        model_used = "deepseek"
    elif openai_key:
        response_text, tokens = await _call_openai(request.prompt, request.language, openai_key)
        model_used = "openai"
    else:
        raise HTTPException(
            status_code=503,
            detail="No AI API keys configured. Please set DEEPSEEK_API_KEY or OPENAI_API_KEY."
        )

    # Log usage to database via SQLAlchemy
    if request.gup_id:
        _log_ai_usage(request.gup_id, "code_generate", model_used, tokens)

    return CodeResponse(
        response=response_text,
        model_used=model_used,
        tokens_used=tokens,
        conversation_id=request.conversation_id
    )


def _log_ai_usage(gup_id: int, request_type: str, model_used: str, tokens: int):
    """Log AI usage to ts_ai_usage table via SQLAlchemy."""
    try:
        session = get_session()
        usage = AiUsage(
            gup_id=gup_id,
            request_type=request_type,
            model_used=model_used,
            tokens_used=tokens,
            cost=_calculate_cost(model_used, tokens),
            created_at=datetime.utcnow()
        )
        session.add(usage)
        session.commit()
        session.close()
    except Exception as e:
        print(f"Failed to log AI usage: {e}")


def _calculate_cost(model: str, tokens: int) -> float:
    """Calculate cost based on model and token count."""
    rates = {
        "deepseek": 0.0001,  # per 1K tokens
        "openai": 0.002,     # per 1K tokens
    }
    rate = rates.get(model, 0.001)
    return round((tokens / 1000) * rate, 6)


async def _call_deepseek(prompt: str, language: str, api_key: str) -> tuple:
    """Call DeepSeek API for code generation."""
    system_prompt = (
        f"You are an expert {language} programmer and coding assistant. "
        "Provide clear, well-commented code with explanations."
    )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-coder",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 4096
            },
            timeout=60.0
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"DeepSeek API error: {response.text}")

    data = response.json()
    text = data["choices"][0]["message"]["content"]
    tokens = data.get("usage", {}).get("total_tokens", 0)
    return text, tokens


async def _call_openai(prompt: str, language: str, api_key: str) -> tuple:
    """Call OpenAI API for code generation."""
    system_prompt = (
        f"You are an expert {language} programmer and coding assistant. "
        "Provide clear, well-commented code with explanations."
    )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 4096
            },
            timeout=60.0
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {response.text}")

    data = response.json()
    text = data["choices"][0]["message"]["content"]
    tokens = data.get("usage", {}).get("total_tokens", 0)
    return text, tokens
