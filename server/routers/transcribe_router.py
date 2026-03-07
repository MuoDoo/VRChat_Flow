import asyncio
import io
import logging
import wave

import aiosqlite
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth import get_current_user
from dashscope_asr import transcribe_audio
from database import get_db
from ratelimit import RateLimiter, get_app_setting

logger = logging.getLogger(__name__)

router = APIRouter()
rate_limiter = RateLimiter()


def _get_wav_duration(wav_data: bytes) -> float:
    """Parse WAV header to compute audio duration in seconds."""
    with wave.open(io.BytesIO(wav_data), "rb") as wf:
        frames = wf.getnframes()
        rate = wf.getframerate()
        if rate == 0:
            raise ValueError("Invalid WAV: sample rate is 0")
        return frames / rate


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    source_lang: str = Form("zh"),
    target_lang: str = Form("en"),
    user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    # 1. Check user is active
    cursor = await db.execute(
        "SELECT is_active FROM users WHERE id = ?", (user["sub"],)
    )
    row = await cursor.fetchone()
    if not row or not row["is_active"]:
        raise HTTPException(
            status_code=403,
            detail={
                "type": "error",
                "code": "AUTH_ACCOUNT_INACTIVE",
                "params": {},
            },
        )

    # 2. Read WAV, validate format, compute duration
    wav_data = await file.read()
    try:
        duration = _get_wav_duration(wav_data)
    except Exception as e:
        logger.warning("Invalid WAV upload: %s", e)
        raise HTTPException(
            status_code=400,
            detail={
                "type": "error",
                "code": "INVALID_AUDIO_FORMAT",
                "params": {},
            },
        )

    max_audio_duration = await get_app_setting("max_audio_duration", 30, db)
    if duration > max_audio_duration:
        raise HTTPException(
            status_code=400,
            detail={
                "type": "error",
                "code": "AUDIO_TOO_LONG",
                "params": {"max": max_audio_duration},
            },
        )

    # 3. Rate limit check (deduct daily quota)
    error_code = await rate_limiter.check_and_consume(user["sub"], duration, db)
    if error_code:
        max_user = await get_app_setting("max_user_daily_seconds", 7200, db)
        remaining = await rate_limiter.get_remaining(user["sub"], db)
        raise HTTPException(
            status_code=429,
            detail={
                "type": "error",
                "code": error_code,
                "params": {
                    "limit": max_user,
                    "used": max_user - remaining,
                },
            },
        )

    # 4. Call DashScope (sync function in thread pool)
    try:
        result = await asyncio.to_thread(
            transcribe_audio, wav_data, source_lang, target_lang
        )
    except Exception as e:
        logger.error("DashScope ASR error: %s", e)
        raise HTTPException(
            status_code=500,
            detail={
                "type": "error",
                "code": "ASR_FAILED",
                "params": {},
            },
        )

    # 5. Return result
    remaining = await rate_limiter.get_remaining(user["sub"], db)
    return {
        "transcription": result.transcription,
        "translation": result.translation,
        "audio_duration": round(duration, 1),
        "remaining_seconds": round(remaining, 1),
    }
