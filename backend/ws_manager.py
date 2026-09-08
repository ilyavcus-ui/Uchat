"""
WebSocket ConnectionManager — управление подключениями и рассылкой.
"""

import asyncio
import logging
from typing import Dict
from fastapi import WebSocket
from database import get_pool

log = logging.getLogger("uchat")


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_to_user: Dict[str, int] = {}
        self._broadcast_task = None

    async def connect(self, websocket: WebSocket, session_id: str, user_id: int = None):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        if user_id:
            self.session_to_user[session_id] = user_id
            await self._set_online(user_id, True)
        log.info(
            "WS connected: session=%s user_id=%s total=%d",
            session_id, user_id, len(self.active_connections)
        )
        await self._schedule_broadcast()

    async def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        user_id = self.session_to_user.pop(session_id, None)
        if user_id:
            has_other = any(uid == user_id for uid in self.session_to_user.values())
            if not has_other:
                await self._set_online(user_id, False)
        log.info("WS disconnected: session=%s total=%d", session_id, len(self.active_connections))
        await self._schedule_broadcast()

    async def _schedule_broadcast(self):
        """Debounce: отправляем список пользователей через 100ms после последнего изменения"""
        if self._broadcast_task:
            self._broadcast_task.cancel()
        self._broadcast_task = asyncio.create_task(self._delayed_broadcast())

    async def _delayed_broadcast(self):
        await asyncio.sleep(0.1)
        await self.broadcast_user_list()

    async def _set_online(self, user_id: int, online: bool):
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE users SET is_online = $1 WHERE id = $2", online, user_id
                )
        except Exception as e:
            log.error("set_online failed: %s", e)

    async def send_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except Exception:
                self._remove_session(session_id)

    async def broadcast(self, message: dict, exclude_session: str = None):
        """Отправка ВСЕМ подключённым"""
        stale = []
        for sid, connection in list(self.active_connections.items()):
            if sid != exclude_session:
                try:
                    await connection.send_json(message)
                except Exception:
                    stale.append(sid)
        for sid in stale:
            self._remove_session(sid)

    async def send_to_user(self, user_id: int, message: dict):
        """Отправка конкретному пользователю (все его сессии)"""
        stale = []
        for sid, uid in list(self.session_to_user.items()):
            if uid == user_id and sid in self.active_connections:
                try:
                    await self.active_connections[sid].send_json(message)
                except Exception:
                    stale.append(sid)
        for sid in stale:
            self._remove_session(sid)

    async def send_to_users(self, user_ids: list, message: dict):
        """Отправка нескольким конкретным пользователям"""
        stale = []
        for sid, uid in list(self.session_to_user.items()):
            if uid in user_ids and sid in self.active_connections:
                try:
                    await self.active_connections[sid].send_json(message)
                except Exception:
                    stale.append(sid)
        for sid in stale:
            self._remove_session(sid)

    def _remove_session(self, session_id: str):
        """Безопасное удаление сессии из всех словарей"""
        self.active_connections.pop(session_id, None)
        user_id = self.session_to_user.pop(session_id, None)
        if user_id:
            has_other = any(uid == user_id for uid in self.session_to_user.values())
            if not has_other:
                asyncio.create_task(self._set_online(user_id, False))

    async def broadcast_user_list(self):
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT id, username, display_name, is_admin, is_online "
                    "FROM users ORDER BY display_name"
                )
                users = [dict(r) for r in rows]
            await self.broadcast({"type": "user_list", "users": users})
        except Exception as e:
            log.error("broadcast_user_list failed: %s", e)


manager = ConnectionManager()
