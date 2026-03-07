import logging
from datetime import date

import aiosqlite

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, max_daily_seconds: int) -> None:
        self.max_daily_seconds = max_daily_seconds
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

        if used + audio_duration > self.max_daily_seconds:
            return "RATE_LIMIT_DAILY"

        new_used = used + audio_duration
        await db.execute(
            "UPDATE users SET daily_seconds = ?, last_reset_date = ? WHERE id = ?",
            (new_used, today, user_id),
        )
        await db.commit()
        self._cache[user_id] = (today, new_used)
        return None

    async def get_remaining(
        self, user_id: int, db: aiosqlite.Connection
    ) -> float:
        _, used = await self._load_user(user_id, db)
        return max(0.0, self.max_daily_seconds - used)
