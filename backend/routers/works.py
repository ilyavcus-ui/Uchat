"""
Works endpoints — CRUD работ + комментарии.
"""

import logging

from fastapi import APIRouter, HTTPException

from database import get_pool, now_ufa
from schemas import CommentCreate, IdResponse, StatusResponse, WorkCreate, WorkUpdate
from ws_manager import manager

log = logging.getLogger("uchat")
router = APIRouter()


# ==================== Bulk ====================

@router.get("/api/works/bulk")
async def get_works_bulk():
    pool = await get_pool()
    async with pool.acquire() as conn:
        works = await conn.fetch("""
            SELECT w.*, u.display_name as creator_name, c.display_name as completer_name,
                   e.display_name as editor_name
            FROM work_notifications w
            JOIN users u ON w.user_id = u.id
            LEFT JOIN users c ON w.completed_by = c.id
            LEFT JOIN users e ON w.edited_by = e.id
            ORDER BY w.created_at DESC
        """)
        all_comments = await conn.fetch("""
            SELECT wc.*, u.display_name as author_name
            FROM work_comments wc
            JOIN users u ON wc.user_id = u.id
        """)
        comments_map = {c['work_id']: dict(c) for c in all_comments}
        result = []
        for w in works:
            d = dict(w)
            d['comment'] = comments_map.get(w['id'])
            result.append(d)
        return result


# ==================== CRUD ====================

@router.post("/api/works", response_model=IdResponse)
async def create_work_notification(data: WorkCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        work_id = await conn.fetchval(
            """
            INSERT INTO work_notifications (user_id, title, description, status, created_at)
            VALUES ($1, $2, $3, 'active', $4)
            RETURNING id
            """,
            data.user_id, data.title, data.description, now_ufa().isoformat()
        )

    await manager.broadcast({
        "type": "work_notification",
        "action": "created",
        "work_id": work_id,
        "user_id": data.user_id
    })
    return IdResponse(id=work_id)


@router.put("/api/works/{work_id}", response_model=StatusResponse)
async def update_work_notification(work_id: int, data: WorkUpdate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        completed_at = now_ufa().isoformat() if data.status == "completed" else None

        if data.is_important is not None:
            await conn.execute(
                """
                UPDATE work_notifications
                SET status = $1, updated_at = $2,
                    completed_at = COALESCE($3, completed_at),
                    completed_by = CASE WHEN $1 = 'completed' THEN $4 ELSE completed_by END,
                    is_important = $5,
                    important_at = CASE WHEN $5 = 0 THEN NULL ELSE important_at END
                WHERE id = $6
                """,
                data.status, now_ufa().isoformat(), completed_at, data.completed_by,
                data.is_important, work_id
            )
        else:
            await conn.execute(
                """
                UPDATE work_notifications
                SET status = $1, updated_at = $2,
                    completed_at = COALESCE($3, completed_at),
                    completed_by = CASE WHEN $1 = 'completed' THEN $4 ELSE completed_by END,
                    is_important = CASE WHEN $1 = 'completed' THEN 0 ELSE is_important END,
                    important_at = CASE WHEN $1 = 'completed' THEN NULL ELSE important_at END
                WHERE id = $5
                """,
                data.status, now_ufa().isoformat(), completed_at, data.completed_by, work_id
            )

    await manager.broadcast({
        "type": "work_notification",
        "action": "updated",
        "work_id": work_id,
        "status": data.status
    })
    return StatusResponse()


@router.put("/api/works/{work_id}/edit", response_model=StatusResponse)
async def edit_work(work_id: int, data: dict):
    title = data.get("title", "").strip()
    edited_by = data.get("edited_by")
    if not title or not edited_by:
        raise HTTPException(status_code=400, detail="title and edited_by required")
    pool = await get_pool()
    async with pool.acquire() as conn:
        now = now_ufa().isoformat()
        await conn.execute(
            "UPDATE work_notifications SET title = $1, edited_by = $2, edited_at = $3, "
            "updated_at = $3 WHERE id = $4",
            title, edited_by, now, work_id
        )
    await manager.broadcast(
        {"type": "work_notification", "action": "edited", "work_id": work_id}
    )
    return StatusResponse()


@router.put("/api/works/{work_id}/important")
async def toggle_work_important(work_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT is_important FROM work_notifications WHERE id = $1", work_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Work not found")
        new_value = 0 if row['is_important'] else 1
        important_at = now_ufa().isoformat() if new_value else None
        await conn.execute(
            "UPDATE work_notifications SET is_important = $1, important_at = $2 WHERE id = $3",
            new_value, important_at, work_id
        )
    await manager.broadcast(
        {"type": "work_notification", "action": "updated", "work_id": work_id}
    )
    return {"is_important": new_value}


@router.delete("/api/works/{work_id}")
async def delete_work_notification(work_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM work_comments WHERE work_id = $1", work_id)
        await conn.execute("DELETE FROM work_logs WHERE work_id = $1", work_id)
        await conn.execute("DELETE FROM work_notifications WHERE id = $1", work_id)

    await manager.broadcast({
        "type": "work_notification",
        "action": "deleted",
        "work_id": work_id
    })
    return {"status": "ok"}


# ==================== Comments ====================

@router.get("/api/works/{work_id}/comments")
async def get_work_comments(work_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        comments = await conn.fetch("""
            SELECT c.*, u.display_name as author_name
            FROM work_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.work_id = $1
            ORDER BY c.created_at ASC
        """, work_id)
        return [dict(c) for c in comments]


@router.post("/api/works/{work_id}/comments", response_model=IdResponse)
async def create_work_comment(work_id: int, data: CommentCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM work_comments WHERE work_id = $1", work_id)
        comment_id = await conn.fetchval("""
            INSERT INTO work_comments (work_id, user_id, content, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """, work_id, data.user_id, data.content.strip(), now_ufa().isoformat())
    await manager.broadcast(
        {"type": "work_notification", "action": "comment", "work_id": work_id}
    )
    return IdResponse(id=comment_id)


@router.delete("/api/works/comments/{comment_id}")
async def delete_work_comment(comment_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM work_comments WHERE id = $1", comment_id)
    return {"status": "ok"}
