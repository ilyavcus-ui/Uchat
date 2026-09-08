"""
Admin endpoints — управление пользователями.
"""

import hashlib
import logging

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_pool, now_ufa
from schemas import StatusResponse, UserCreate
from ws_manager import manager

log = logging.getLogger("uchat")
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/api/admin/users")
async def admin_list_users():
    pool = await get_pool()
    async with pool.acquire() as conn:
        users = await conn.fetch(
            "SELECT id, username, display_name, is_admin, created_at "
            "FROM users ORDER BY created_at"
        )
        return [dict(u) for u in users]


@router.post("/api/admin/users", response_model=StatusResponse)
@limiter.limit("10/minute")
async def admin_create_user(request: Request, data: UserCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        password_hash = hashlib.sha256(data.password.encode()).hexdigest()
        try:
            await conn.execute(
                """
                INSERT INTO users
                    (username, display_name, password_hash, is_admin, created_at)
                VALUES ($1, $2, $3, $4, $5)
                """,
                data.username, data.display_name, password_hash, data.is_admin,
                now_ufa().isoformat()
            )
        except Exception as e:
            if "unique" in str(e).lower():
                log.warning(
                    "Admin create user failed: username '%s' already exists", data.username
                )
                raise HTTPException(status_code=400, detail="Username already exists")
            raise

    log.info("Admin created user: %s (admin=%s)", data.username, data.is_admin)
    await manager.broadcast_user_list()
    return StatusResponse()


@router.delete("/api/admin/users/{user_id}")
async def admin_delete_user(user_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Удаляем связанные записи (порядок важен из-за foreign keys)
        await conn.execute("DELETE FROM work_comments WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM event_comments WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM work_logs WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM event_logs WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM work_notifications WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM events WHERE user_id = $1", user_id)
        await conn.execute("DELETE FROM lunches WHERE user_id = $1", user_id)
        await conn.execute(
            "DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", user_id
        )
        await conn.execute(
            "DELETE FROM message_read WHERE user_id = $1 OR other_user_id = $1", user_id
        )

        result = await conn.execute(
            "DELETE FROM users WHERE id = $1 AND username != 'admin'", user_id
        )

    if result and 'DELETE' in result:
        log.info("Admin deleted user id=%d", user_id)
    else:
        log.warning("Admin delete user id=%d: not found or protected", user_id)
    await manager.broadcast_user_list()
    return {"status": "ok"}


@router.put("/api/admin/users/{user_id}/password")
async def admin_change_password(user_id: int, data: dict):
    new_password = data.get("password", "").strip()
    if not new_password or len(new_password) < 1:
        raise HTTPException(status_code=400, detail="Password required")
    pool = await get_pool()
    async with pool.acquire() as conn:
        password_hash = hashlib.sha256(new_password.encode()).hexdigest()
        result = await conn.execute(
            "UPDATE users SET password_hash = $1 WHERE id = $2", password_hash, user_id
        )
        if result and 'UPDATE' in result:
            log.info("Admin changed password for user id=%d", user_id)
    return {"status": "ok"}


@router.get("/api/users/bulk")
async def get_users_bulk():
    """Все пользователи с последним сообщением за один запрос (JOIN вместо N+1)"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        users = await conn.fetch("""
            SELECT u.id, u.username, u.display_name, u.is_admin, u.is_online,
                   (SELECT MAX(m.created_at) FROM messages m
                    WHERE m.sender_id = u.id) as last_message_at
            FROM users u
            ORDER BY u.display_name
        """)
        return [dict(u) for u in users]
