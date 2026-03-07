import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_admin
from database import get_db

router = APIRouter()


class UserPatch(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


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
