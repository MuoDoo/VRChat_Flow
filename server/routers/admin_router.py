from __future__ import annotations

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_admin
from database import get_db

router = APIRouter()


class UserPatch(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class SettingUpdate(BaseModel):
    value: str


@router.get("/users")
async def list_users(
    _user: dict = Depends(require_admin),
    db: aiosqlite.Connection = Depends(get_db),
) -> list[dict]:
    cursor = await db.execute(
        "SELECT id, username, is_active, is_admin, created_at, daily_seconds, last_reset_date "
        "FROM users ORDER BY id"
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    body: UserPatch,
    _user: dict = Depends(require_admin),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    cursor = await db.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not await cursor.fetchone():
        raise HTTPException(
            status_code=404,
            detail={"type": "error", "code": "USER_NOT_FOUND", "params": {}},
        )

    updates: list[str] = []
    values: list[object] = []

    if body.is_active is not None:
        updates.append("is_active = ?")
        values.append(int(body.is_active))
    if body.is_admin is not None:
        updates.append("is_admin = ?")
        values.append(int(body.is_admin))

    if not updates:
        raise HTTPException(
            status_code=400,
            detail={"type": "error", "code": "NO_FIELDS_TO_UPDATE", "params": {}},
        )

    values.append(user_id)
    await db.execute(
        f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values
    )
    await db.commit()

    cursor = await db.execute(
        "SELECT id, username, is_active, is_admin, created_at FROM users WHERE id = ?",
        (user_id,),
    )
    row = await cursor.fetchone()
    return dict(row)  # type: ignore[arg-type]


@router.get("/stats")
async def get_stats(
    _user: dict = Depends(require_admin),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    """Dashboard stats: per-user usage today, global total, limits."""
    from datetime import date

    today = date.today().isoformat()

    # Per-user usage today
    cursor = await db.execute(
        "SELECT u.id, u.username, u.daily_seconds, u.last_reset_date "
        "FROM users u ORDER BY u.daily_seconds DESC"
    )
    rows = await cursor.fetchall()
    users = []
    global_used = 0.0
    for r in rows:
        used = float(r["daily_seconds"]) if r["last_reset_date"] == today else 0.0
        global_used += used
        users.append({
            "id": r["id"],
            "username": r["username"],
            "daily_seconds": round(used, 1),
        })

    # Read limits from app_settings
    settings: dict[str, float] = {}
    cursor = await db.execute("SELECT key, value FROM app_settings")
    for row in await cursor.fetchall():
        settings[row["key"]] = float(row["value"])

    return {
        "today": today,
        "global_used": round(global_used, 1),
        "max_global_daily_seconds": settings.get("max_global_daily_seconds", 36000),
        "max_user_daily_seconds": settings.get("max_user_daily_seconds", 7200),
        "max_audio_duration": settings.get("max_audio_duration", 30),
        "users": users,
    }


@router.get("/usage-history")
async def get_usage_history(
    days: int = 30,
    _user: dict = Depends(require_admin),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    """Historical usage: per-user daily totals and global daily totals."""
    if days < 1:
        days = 1
    if days > 365:
        days = 365

    # Per-user per-day
    cursor = await db.execute(
        "SELECT uh.date, uh.user_id, u.username, uh.seconds "
        "FROM usage_history uh JOIN users u ON uh.user_id = u.id "
        "WHERE uh.date >= date('now', ?)"
        " ORDER BY uh.date DESC, uh.seconds DESC",
        (f"-{days} days",),
    )
    rows = await cursor.fetchall()
    per_user: list[dict] = [
        {
            "date": r["date"],
            "user_id": r["user_id"],
            "username": r["username"],
            "seconds": round(float(r["seconds"]), 1),
        }
        for r in rows
    ]

    # Global daily totals
    cursor = await db.execute(
        "SELECT date, SUM(seconds) as total "
        "FROM usage_history "
        "WHERE date >= date('now', ?) "
        "GROUP BY date ORDER BY date",
        (f"-{days} days",),
    )
    rows = await cursor.fetchall()
    daily_totals: list[dict] = [
        {"date": r["date"], "total": round(float(r["total"]), 1)}
        for r in rows
    ]

    return {
        "per_user": per_user,
        "daily_totals": daily_totals,
    }


@router.get("/settings")
async def get_settings(
    _user: dict = Depends(require_admin),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    cursor = await db.execute("SELECT key, value FROM app_settings")
    rows = await cursor.fetchall()
    return {r["key"]: r["value"] for r in rows}


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    body: SettingUpdate,
    _user: dict = Depends(require_admin),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    allowed_keys = {"max_user_daily_seconds", "max_global_daily_seconds", "max_audio_duration", "auto_activate_users"}
    if key not in allowed_keys:
        raise HTTPException(
            status_code=400,
            detail={"type": "error", "code": "INVALID_SETTING_KEY", "params": {"key": key}},
        )
    try:
        float(body.value)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail={"type": "error", "code": "INVALID_SETTING_VALUE", "params": {}},
        )

    await db.execute(
        "INSERT INTO app_settings (key, value) VALUES (?, ?)"
        " ON CONFLICT(key) DO UPDATE SET value = ?",
        (key, body.value, body.value),
    )
    await db.commit()
    return {"key": key, "value": body.value}
