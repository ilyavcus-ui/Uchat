"""
Lunches endpoints — график обедов.
"""

from fastapi import APIRouter, Query

from database import get_pool, now_ufa
from schemas import LunchCreate, StatusResponse
from ws_manager import manager

router = APIRouter()


@router.get("/api/lunches")
async def get_lunches(date: str = Query(None)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if date:
            lunches = await conn.fetch("""
                SELECT l.*, u.display_name as display_name, u.username as username
                FROM lunches l
                JOIN users u ON l.user_id = u.id
                WHERE l.lunch_date = $1
                ORDER BY l.lunch_hour
            """, date)
        else:
            lunches = await conn.fetch("""
                SELECT l.*, u.display_name as display_name, u.username as username
                FROM lunches l
                JOIN users u ON l.user_id = u.id
                ORDER BY l.lunch_date, l.lunch_hour
            """)
        return [dict(r) for r in lunches]


@router.post("/api/lunches", response_model=StatusResponse)
async def create_lunch(data: LunchCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM lunches WHERE user_id = $1 AND lunch_date = $2 AND lunch_hour = $3",
            data.user_id, data.lunch_date, data.lunch_hour
        )
        await conn.execute("""
            INSERT INTO lunches (user_id, lunch_date, lunch_hour, created_at)
            VALUES ($1, $2, $3, $4)
        """, data.user_id, data.lunch_date, data.lunch_hour, now_ufa().isoformat())
    await manager.broadcast({"type": "lunch_notification"})
    return StatusResponse()


@router.delete("/api/lunches/{lunch_id}")
async def delete_lunch(lunch_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM lunches WHERE id = $1", lunch_id)
    await manager.broadcast({"type": "lunch_notification"})
    return {"status": "ok"}
