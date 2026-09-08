"""
Messages endpoints — личные сообщения, вложения (картинки/файлы).
"""

import logging
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from config import MAX_UPLOAD_SIZE, UPLOADS_DIR
from database import get_pool, now_ufa
from ws_manager import manager

log = logging.getLogger("uchat")
router = APIRouter()

IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}


async def _deliver(message_data: dict, sender_id: int, receiver_id: int = None):
    """Рассылка нового сообщения через WS — общая логика для текста и вложений."""
    if receiver_id:
        await manager.send_to_user(receiver_id, message_data)
        if receiver_id != sender_id:
            await manager.send_to_user(sender_id, message_data)
    else:
        await manager.broadcast(message_data)


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

    await _deliver(message_data, sender_id, receiver_id)
    return {"status": "ok", "message": message_data["message"]}


@router.post("/api/messages/upload")
async def upload_message_file(
    sender_id: int = Form(...),
    receiver_id: Optional[int] = Form(None),
    file: UploadFile = File(...)
):
    if receiver_id and receiver_id == sender_id:
        raise HTTPException(status_code=400, detail="cannot message yourself")

    suffix = Path(file.filename or "").suffix[:20]
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    dest_path = UPLOADS_DIR / stored_name

    size = 0
    try:
        with open(dest_path, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_SIZE:
                    out.close()
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File too large (max 20 MB)")
                out.write(chunk)
    finally:
        await file.close()

    mime_type = file.content_type or "application/octet-stream"
    message_type = "image" if mime_type in IMAGE_MIME_TYPES else "file"
    file_name = (file.filename or stored_name)[:255]

    pool = await get_pool()
    async with pool.acquire() as conn:
        message_id = await conn.fetchval(
            """
            INSERT INTO messages
                (sender_id, receiver_id, content, message_type, created_at,
                 file_name, stored_name, file_size, mime_type)
            VALUES ($1, $2, '', $3, $4, $5, $6, $7, $8)
            RETURNING id
            """,
            sender_id, receiver_id, message_type, now_ufa().isoformat(),
            file_name, stored_name, size, mime_type
        )
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
            "content": "",
            "message_type": message_type,
            "file_name": file_name,
            "file_size": size,
            "mime_type": mime_type,
            "created_at": now_ufa().isoformat()
        }
    }

    await _deliver(message_data, sender_id, receiver_id)
    return {"status": "ok", "message": message_data["message"]}


@router.get("/api/messages/{message_id}/file")
async def get_message_file(message_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT message_type, file_name, stored_name, mime_type "
            "FROM messages WHERE id = $1", message_id
        )

    if not row or row["message_type"] not in ("image", "file") or not row["stored_name"]:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = UPLOADS_DIR / row["stored_name"]
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    is_download = row["message_type"] == "file"
    return FileResponse(
        file_path,
        media_type=row["mime_type"] or "application/octet-stream",
        filename=row["file_name"] if is_download else None
    )


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
