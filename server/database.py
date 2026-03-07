import logging
import secrets
import string

import aiosqlite

from config import settings
from auth import hash_password

logger = logging.getLogger(__name__)

_db: aiosqlite.Connection | None = None


async def init_db() -> None:
    global _db
    _db = await aiosqlite.connect(settings.database_path)
    _db.row_factory = aiosqlite.Row

    await _db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            username        TEXT    UNIQUE NOT NULL,
            password_hash   TEXT    NOT NULL,
            is_active       INTEGER NOT NULL DEFAULT 0,
            is_admin        INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            daily_seconds   REAL    NOT NULL DEFAULT 0.0,
            last_reset_date TEXT    NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL REFERENCES users(id),
            token_hash  TEXT    UNIQUE NOT NULL,
            expires_at  TEXT    NOT NULL,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS usage_history (
            user_id   INTEGER NOT NULL REFERENCES users(id),
            date      TEXT NOT NULL,
            seconds   REAL NOT NULL DEFAULT 0.0,
            PRIMARY KEY (user_id, date)
        );
    """)

    # Seed default app_settings if not present
    defaults = {
        "max_user_daily_seconds": str(settings.max_user_daily_seconds),
        "max_global_daily_seconds": "36000",
        "max_audio_duration": str(settings.max_audio_duration),
        "auto_activate_users": "0",
    }
    for key, default_value in defaults.items():
        await _db.execute(
            "INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)",
            (key, default_value),
        )
    await _db.commit()

    # Create admin account on first run
    cursor = await _db.execute(
        "SELECT id FROM users WHERE username = ?", ("admin",)
    )
    if await cursor.fetchone() is None:
        password = settings.admin_init_password
        if not password:
            password = "".join(
                secrets.choice(string.ascii_letters + string.digits)
                for _ in range(16)
            )
            logger.warning("Generated admin password: %s", password)
            print(f"\n{'='*50}")
            print(f"  Admin initial password: {password}")
            print(f"{'='*50}\n")

        pw_hash = hash_password(password)
        await _db.execute(
            "INSERT INTO users (username, password_hash, is_active, is_admin) VALUES (?, ?, 1, 1)",
            ("admin", pw_hash),
        )
        await _db.commit()
        logger.info("Admin account created")

    await _db.commit()


async def get_db() -> aiosqlite.Connection:
    assert _db is not None, "Database not initialized"
    return _db


async def close_db() -> None:
    global _db
    if _db:
        await _db.close()
        _db = None
