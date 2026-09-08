"""
Health check endpoint.
"""

from fastapi import APIRouter
from database import get_pool
from ws_manager import manager

router = APIRouter()


@router.get("/api/health")
async def health():
    pool = await get_pool()
    async with pool.acquire() as conn:
        pg_ok = await conn.fetchval("SELECT 1")
        active_users = await conn.fetchval("SELECT COUNT(*) FROM users WHERE is_online = TRUE")
    return {
        "status": "ok",
        "websocket_connections": len(manager.active_connections),
        "active_users": active_users,
        "database": "ok" if pg_ok else "error"
    }
