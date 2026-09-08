"""
Messages endpoints — личные сообщения.
"""

import logging

from fastapi import APIRouter, Query

from database import get_pool, now_ufa
from ws_manager import manager

log = logging.getLogger("uchat")
router = APIRouter()


@router.post("/api/messages")
async def send_message(data: dict):
    sender_id = data.get("sender_id")
    receiver_id = data.get("receiver_id")
    content = data.get("content", "").strip()

    if not sender_id or not content:
        return {"status": "error", "detail": "sender_id and content required"}

    if receiver_id and receiver_id == sender_id:
        return {"status": "error", "detail": "cannot message yourself"}

    pool = await get_pool()
    async with pool.acquire() as conn:
        message_id = await conn.fetchval("""
            INSERT INTO messages (sender_id, receiver_id, content, message_type, created_at)
            VALUES ($1, $2, $3, 'text', $4)
            RETURNING id
        """, sender_id, receiver_id, content, now_ufa().isoformat())

        sender = await conn.fetchrow(
            "SELECT username, display_name FROM users WHERE id = $1", sender_id
        )

    message_data = {
        "type": "new_message",
        "message": {
            "id": message_id,
            "sender_id": sender_id,
            "username": sender["username"] if sender else "unknown",
            "display_name": sender["display_name"] if sender else "Unknown",
            "receiver_id": receiver_id,
            "content": content,
            "message_type": "text",
            "created_at": now_ufa().isoformat()
        }
    }

    if receiver_id:
        await manager.send_to_user(receiver_id, message_data)
        if receiver_id != sender_id:
            await manager.send_to_user(sender_id, message_data)
    else:
        await manager.broadcast(message_data)

    return {"status": "ok", "message": message_data["message"]}


@router.get("/api/messages/unread/{user_id}")
async def get_unread_counts(user_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT m.sender_id, COUNT(*) as count
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN message_read mr ON mr.user_id = $1 AND mr.other_user_id = m.sender_id
            WHERE m.receiver_id = $1 AND m.sender_id != $1
              AND (mr.last_read_at IS NULL OR m.created_at > mr.last_read_at)
            GROUP BY m.sender_id
        """, user_id)
        return {row['sender_id']: row['count'] for row in rows}


@router.post("/api/messages/read/{user_id}")
async def mark_as_read(user_id: int, data: dict):
    other_user_id = data.get("other_user_id")
    pool = await get_pool()
    async with pool.acquire() as conn:
        now = now_ufa().isoformat()
        await conn.execute("""
            INSERT INTO message_read (user_id, other_user_id, last_read_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, other_user_id) DO UPDATE SET last_read_at = $3
        """, user_id, other_user_id, now)
    return {"status": "ok"}


@router.get("/api/messages/private/{user_id}")
async def get_private_messages(user_id: int, current_user_id: int = Query(...)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        messages = await conn.fetch("""
            SELECT m.*, u.username, u.display_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at DESC
        """, current_user_id, user_id)
        return list(reversed([dict(m) for m in messages]))


@router.get("/api/messages/search")
async def search_messages(
    q: str = Query(..., min_length=1),
    current_user_id: int = Query(...),
    other_user_id: int = Query(...)
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        pattern = f"%{q}%"
        messages = await conn.fetch("""
            SELECT m.*, u.username, u.display_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.content LIKE $1
              AND (
                (m.sender_id = $2 AND m.receiver_id = $3)
                OR (m.sender_id = $3 AND m.receiver_id = $2)
              )
            ORDER BY m.created_at DESC
            LIMIT 50
        """, pattern, current_user_id, other_user_id)
        return list(reversed([dict(m) for m in messages]))
