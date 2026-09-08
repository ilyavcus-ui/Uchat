"""
Events endpoints — CRUD событий + комментарии.
"""

import logging

from fastapi import APIRouter, HTTPException

from database import get_pool, now_ufa
from schemas import CommentCreate, EventCreate, EventUpdate, IdResponse, StatusResponse
from ws_manager import manager

log = logging.getLogger("uchat")
router = APIRouter()


# ==================== Bulk ====================

@router.get("/api/events/bulk")
async def get_events_bulk():
    pool = await get_pool()
    async with pool.acquire() as conn:
        events = await conn.fetch("""
            SELECT e.*, u.display_name as creator_name, c.display_name as completer_name,
                   ed.display_name as editor_name
            FROM events e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN users c ON e.completed_by = c.id
            LEFT JOIN users ed ON e.edited_by = ed.id
            ORDER BY e.created_at DESC
        """)
        all_comments = await conn.fetch("""
            SELECT ec.*, u.display_name as author_name
            FROM event_comments ec
            JOIN users u ON ec.user_id = u.id
        """)
        comments_map = {c['event_id']: dict(c) for c in all_comments}
        result = []
        for e in events:
            d = dict(e)
            d['comment'] = comments_map.get(e['id'])
            result.append(d)
        return result


# ==================== CRUD ====================

@router.post("/api/events", response_model=IdResponse)
async def create_event(data: EventCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        event_id = await conn.fetchval(
            """
            INSERT INTO events (user_id, title, description, status, created_at, event_time)
            VALUES ($1, $2, $3, 'active', $4, $5)
            RETURNING id
            """,
            data.user_id, data.title, data.description, now_ufa().isoformat(), data.event_time
        )

    await manager.broadcast({
        "type": "event_notification",
        "action": "created",
        "event_id": event_id,
        "user_id": data.user_id
    })
    return IdResponse(id=event_id)


@router.put("/api/events/{event_id}", response_model=StatusResponse)
async def update_event(event_id: int, data: EventUpdate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        completed_at = now_ufa().isoformat() if data.status == "completed" else None

        if data.is_important is not None:
            await conn.execute(
                """
                UPDATE events
                SET status = $1, updated_at = $2,
                    completed_at = COALESCE($3, completed_at),
                    completed_by = CASE WHEN $1 = 'completed' THEN $4 ELSE completed_by END,
                    is_important = $5,
                    important_at = CASE WHEN $5 = 0 THEN NULL ELSE important_at END
                WHERE id = $6
                """,
                data.status, now_ufa().isoformat(), completed_at, data.completed_by,
                data.is_important, event_id
            )
        else:
            await conn.execute(
                """
                UPDATE events
                SET status = $1, updated_at = $2,
                    completed_at = COALESCE($3, completed_at),
                    completed_by = CASE WHEN $1 = 'completed' THEN $4 ELSE completed_by END,
                    is_important = CASE WHEN $1 = 'completed' THEN 0 ELSE is_important END,
                    important_at = CASE WHEN $1 = 'completed' THEN NULL ELSE important_at END
                WHERE id = $5
                """,
                data.status, now_ufa().isoformat(), completed_at, data.completed_by, event_id
            )

    await manager.broadcast({
        "type": "event_notification",
        "action": "updated",
        "event_id": event_id,
        "status": data.status
    })
    return StatusResponse()


@router.put("/api/events/{event_id}/edit", response_model=StatusResponse)
async def edit_event(event_id: int, data: dict):
    title = data.get("title", "").strip()
    edited_by = data.get("edited_by")
    if not title or not edited_by:
        raise HTTPException(status_code=400, detail="title and edited_by required")
    pool = await get_pool()
    async with pool.acquire() as conn:
        now = now_ufa().isoformat()
        await conn.execute(
            "UPDATE events SET title = $1, edited_by = $2, edited_at = $3, "
            "updated_at = $3 WHERE id = $4",
            title, edited_by, now, event_id
        )
    await manager.broadcast(
        {"type": "event_notification", "action": "edited", "event_id": event_id}
    )
    return StatusResponse()


@router.put("/api/events/{event_id}/time", response_model=StatusResponse)
async def update_event_time(event_id: int, data: dict):
    event_time = data.get("event_time")
    pool = await get_pool()
    async with pool.acquire() as conn:
        now = now_ufa().isoformat()
        await conn.execute(
            "UPDATE events SET event_time = $1, updated_at = $2, status = 'active', "
            "completed_at = NULL WHERE id = $3",
            event_time, now, event_id
        )
    await manager.broadcast(
        {"type": "event_notification", "action": "updated", "event_id": event_id}
    )
    return StatusResponse()


@router.put("/api/events/{event_id}/important")
async def toggle_event_important(event_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT is_important FROM events WHERE id = $1", event_id)
        if not row:
            raise HTTPException(status_code=404, detail="Event not found")
        new_value = 0 if row['is_important'] else 1
        important_at = now_ufa().isoformat() if new_value else None
        await conn.execute(
            "UPDATE events SET is_important = $1, important_at = $2 WHERE id = $3",
            new_value, important_at, event_id
        )
    await manager.broadcast(
        {"type": "event_notification", "action": "updated", "event_id": event_id}
    )
    return {"is_important": new_value}


@router.delete("/api/events/{event_id}")
async def delete_event(event_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM event_comments WHERE event_id = $1", event_id)
        await conn.execute("DELETE FROM event_logs WHERE event_id = $1", event_id)
        await conn.execute("DELETE FROM events WHERE id = $1", event_id)

    await manager.broadcast({
        "type": "event_notification",
        "action": "deleted",
        "event_id": event_id
    })
    return {"status": "ok"}


# ==================== Comments ====================

@router.get("/api/events/{event_id}/comments")
async def get_event_comments(event_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        comments = await conn.fetch("""
            SELECT c.*, u.display_name as author_name
            FROM event_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.event_id = $1
            ORDER BY c.created_at ASC
        """, event_id)
        return [dict(c) for c in comments]


@router.post("/api/events/{event_id}/comments", response_model=IdResponse)
async def create_event_comment(event_id: int, data: CommentCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM event_comments WHERE event_id = $1", event_id)
        comment_id = await conn.fetchval("""
            INSERT INTO event_comments (event_id, user_id, content, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """, event_id, data.user_id, data.content.strip(), now_ufa().isoformat())
    await manager.broadcast(
        {"type": "event_notification", "action": "comment", "event_id": event_id}
    )
    return IdResponse(id=comment_id)


@router.delete("/api/events/comments/{comment_id}")
async def delete_event_comment(comment_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM event_comments WHERE id = $1", comment_id)
    return {"status": "ok"}
