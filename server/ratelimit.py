import logging
from datetime import date

import aiosqlite

logger = logging.getLogger(__name__)


async def get_app_setting(key: str, default: float, db: aiosqlite.Connection) -> float:
    cursor = await db.execute(
        "SELECT value FROM app_settings WHERE key = ?", (key,)
    )
    row = await cursor.fetchone()
    if row:
        return float(row["value"])
    return default


class RateLimiter:
    def __init__(self) -> None:
        # In-memory cache: {user_id: (date_str, used_seconds)}
        self._cache: dict[int, tuple[str, float]] = {}

    async def _load_user(
        self, user_id: int, db: aiosqlite.Connection
    ) -> tuple[str, float]:
        today = date.today().isoformat()

        # Check cache
        if user_id in self._cache:
            cached_date, cached_used = self._cache[user_id]
            if cached_date == today:
                return today, cached_used

        # Load from DB
        cursor = await db.execute(
            "SELECT daily_seconds, last_reset_date FROM users WHERE id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            return today, 0.0

        db_used = float(row["daily_seconds"])
        db_date = row["last_reset_date"]

        # Day rollover: reset counter
        if db_date != today:
            await db.execute(
                "UPDATE users SET daily_seconds = 0.0, last_reset_date = ? WHERE id = ?",
                (today, user_id),
            )
            await db.commit()
            self._cache[user_id] = (today, 0.0)
            return today, 0.0

        self._cache[user_id] = (today, db_used)
        return today, db_used

    async def check_and_consume(
        self, user_id: int, audio_duration: float, db: aiosqlite.Connection
    ) -> str | None:
        today, used = await self._load_user(user_id, db)

        # Per-user daily limit
        max_user = await get_app_setting("max_user_daily_seconds", 7200, db)
        if used + audio_duration > max_user:
            return "RATE_LIMIT_DAILY"

        # Global daily limit
        max_global = await get_app_setting("max_global_daily_seconds", 36000, db)
        cursor = await db.execute(
            "SELECT COALESCE(SUM(daily_seconds), 0) FROM users WHERE last_reset_date = ?",
            (today,),
        )
        row = await cursor.fetchone()
        global_used = float(row[0])
        if global_used + audio_duration > max_global:
            return "RATE_LIMIT_GLOBAL_DAILY"

        # Consume
        new_used = used + audio_duration
        await db.execute(
            "UPDATE users SET daily_seconds = ?, last_reset_date = ? WHERE id = ?",
            (new_used, today, user_id),
        )
        # Update usage_history
        await db.execute(
            "INSERT INTO usage_history (user_id, date, seconds) VALUES (?, ?, ?)"
            " ON CONFLICT(user_id, date) DO UPDATE SET seconds = seconds + ?",
            (user_id, today, audio_duration, audio_duration),
        )
        await db.commit()
        self._cache[user_id] = (today, new_used)
        return None

    async def get_remaining(
        self, user_id: int, db: aiosqlite.Connection
    ) -> float:
        max_user = await get_app_setting("max_user_daily_seconds", 7200, db)
        _, used = await self._load_user(user_id, db)
        return max(0.0, max_user - used)
