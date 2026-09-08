"""
Пул соединений с PostgreSQL, инициализация БД, утилиты.
"""

import hashlib
import logging
from datetime import datetime, timedelta, timezone

import asyncpg

from config import DATABASE_URL

log = logging.getLogger("uchat")

# Часовой пояс Уфы (UTC+5)
UFA_TZ = timezone(timedelta(hours=5))


def now_ufa():
    """Текущее время в часовом поясе Уфы без информации о таймзоне"""
    return datetime.now(UFA_TZ).replace(tzinfo=None)


# Пул соединений
_pool: asyncpg.Pool = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
    return _pool


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def init_db():
    """Проверка подключения к БД и создание дефолтного admin при необходимости.
    Таблицы создаются через migrate_sqlite_to_pg.sql или init_db при первом запуске."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Проверяем доступность БД
        await conn.fetchval("SELECT 1")

        # Создаём таблицы если их нет (первый запуск без миграции)
        await _ensure_tables(conn)

        # Создаём дефолтного admin если БД пуста
        count = await conn.fetchval("SELECT COUNT(*) FROM users")
        if count == 0:
            admin_password = hashlib.sha256("admin123".encode()).hexdigest()
            await conn.execute("""
                INSERT INTO users (username, display_name, password_hash, is_admin, created_at)
                VALUES ('admin', 'Администратор', $1, TRUE, $2)
            """, admin_password, now_ufa().isoformat())
            log.info("Created default admin user")


async def _ensure_tables(conn):
    """Создание таблиц если их ещё нет (idempotent)."""
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            is_online BOOLEAN DEFAULT FALSE,
            last_seen TEXT,
            created_at TEXT NOT NULL
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER NOT NULL REFERENCES users(id),
            receiver_id INTEGER REFERENCES users(id),
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text',
            created_at TEXT NOT NULL
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS work_notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            title TEXT NOT NULL,
            description TEXT,
            status TEXT CHECK(status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT,
            completed_at TEXT,
            completed_by INTEGER REFERENCES users(id),
            is_important INTEGER DEFAULT 0,
            important_at TEXT,
            edited_by INTEGER REFERENCES users(id),
            edited_at TEXT
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            title TEXT NOT NULL,
            description TEXT,
            status TEXT CHECK(status IN ('active', 'completed', 'cancelled', 'expired'))
                DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT,
            completed_at TEXT,
            completed_by INTEGER REFERENCES users(id),
            event_time TEXT,
            is_important INTEGER DEFAULT 0,
            important_at TEXT,
            edited_by INTEGER REFERENCES users(id),
            edited_at TEXT
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS lunches (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            lunch_date TEXT NOT NULL,
            lunch_hour INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS event_comments (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL REFERENCES events(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS work_comments (
            id SERIAL PRIMARY KEY,
            work_id INTEGER NOT NULL REFERENCES work_notifications(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS work_logs (
            id SERIAL PRIMARY KEY,
            work_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            completed_by INTEGER,
            archived_at TEXT NOT NULL,
            creator_name TEXT,
            completer_name TEXT
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS event_logs (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            completed_by INTEGER,
            event_time TEXT,
            archived_at TEXT NOT NULL,
            creator_name TEXT,
            completer_name TEXT
        )
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS message_read (
            user_id INTEGER,
            other_user_id INTEGER,
            last_read_at TEXT,
            PRIMARY KEY (user_id, other_user_id)
        )
    """)
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_works_status ON work_notifications(status)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_works_user ON work_notifications(user_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_lunches_date ON lunches(lunch_date)")
    await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_work_comments_work ON work_comments(work_id)"
    )
    await conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_event_comments_event ON event_comments(event_id)"
    )


async def cleanup_old_messages():
    pool = await get_pool()
    async with pool.acquire() as conn:
        one_month_ago = (now_ufa() - timedelta(days=30)).isoformat()
        await conn.execute("DELETE FROM messages WHERE created_at < $1", one_month_ago)
