import re
from datetime import datetime, timedelta, timezone

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
)
from config import settings
from database import get_db
from ratelimit import get_app_setting

router = APIRouter()

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")
MIN_PASSWORD_LENGTH = 8


class AuthRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register")
async def register(
    body: AuthRequest, db: aiosqlite.Connection = Depends(get_db)
) -> dict:
    if not USERNAME_RE.match(body.username):
        raise HTTPException(
            status_code=400,
            detail={
                "type": "error",
                "code": "AUTH_INVALID_USERNAME",
                "params": {},
            },
        )
    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail={
                "type": "error",
                "code": "AUTH_PASSWORD_TOO_SHORT",
                "params": {"min": MIN_PASSWORD_LENGTH},
            },
        )

    # Check if username taken
    cursor = await db.execute(
        "SELECT id FROM users WHERE username = ?", (body.username,)
    )
    if await cursor.fetchone():
        raise HTTPException(
            status_code=409,
            detail={
                "type": "error",
                "code": "AUTH_USERNAME_TAKEN",
                "params": {},
            },
        )

    pw_hash = hash_password(body.password)
    auto_activate = int(await get_app_setting("auto_activate_users", 0, db))
    await db.execute(
        "INSERT INTO users (username, password_hash, is_active) VALUES (?, ?, ?)",
        (body.username, pw_hash, auto_activate),
    )
    await db.commit()
    if auto_activate:
        return {"code": "REGISTER_SUCCESS"}
    return {"code": "REGISTER_SUCCESS_PENDING"}


@router.post("/login")
async def login(
    body: AuthRequest, db: aiosqlite.Connection = Depends(get_db)
) -> dict:
    cursor = await db.execute(
        "SELECT id, username, password_hash, is_active, is_admin FROM users WHERE username = ?",
        (body.username,),
    )
    user = await cursor.fetchone()
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail={
                "type": "error",
                "code": "AUTH_INVALID_CREDENTIALS",
                "params": {},
            },
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail={
                "type": "error",
                "code": "AUTH_ACCOUNT_INACTIVE",
                "params": {},
            },
        )

    access = create_access_token(user["id"], user["username"], bool(user["is_admin"]))
    refresh = create_refresh_token()
    refresh_hash = hash_token(refresh)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    await db.execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user["id"], refresh_hash, expires.isoformat()),
    )
    await db.commit()

    return {"access_token": access, "refresh_token": refresh}


@router.post("/refresh")
async def refresh(
    body: RefreshRequest, db: aiosqlite.Connection = Depends(get_db)
) -> dict:
    token_hash = hash_token(body.refresh_token)
    cursor = await db.execute(
        "SELECT rt.user_id, rt.expires_at, u.username, u.is_admin "
        "FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id "
        "WHERE rt.token_hash = ?",
        (token_hash,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=401,
            detail={
                "type": "error",
                "code": "AUTH_INVALID_TOKEN",
                "params": {},
            },
        )

    expires = datetime.fromisoformat(row["expires_at"])
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        await db.execute(
            "DELETE FROM refresh_tokens WHERE token_hash = ?", (token_hash,)
        )
        await db.commit()
        raise HTTPException(
            status_code=401,
            detail={
                "type": "error",
                "code": "AUTH_INVALID_TOKEN",
                "params": {},
            },
        )

    access = create_access_token(
        row["user_id"], row["username"], bool(row["is_admin"])
    )
    return {"access_token": access}


@router.post("/logout", status_code=204)
async def logout(
    body: RefreshRequest, db: aiosqlite.Connection = Depends(get_db)
) -> None:
    token_hash = hash_token(body.refresh_token)
    await db.execute(
        "DELETE FROM refresh_tokens WHERE token_hash = ?", (token_hash,)
    )
    await db.commit()
