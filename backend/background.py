"""
Фоновые задачи: очистка, архивация, heartbeat, daily reset, автозавершение.
"""

import asyncio
import logging
from datetime import timedelta
from database import get_pool, now_ufa, cleanup_old_messages

log = logging.getLogger("uchat")


def create_background_tasks(manager):
    """Создание и запуск всех фоновых задач"""
    asyncio.create_task(_periodic_cleanup())
    asyncio.create_task(_daily_reset(manager))
    asyncio.create_task(_auto_complete_events(manager))
    asyncio.create_task(_archive_old_events())
    asyncio.create_task(_archive_old_works())
    asyncio.create_task(_heartbeat(manager))


async def _periodic_cleanup():
    while True:
        try:
            await asyncio.sleep(3600)
            await cleanup_old_messages()
        except Exception as e:
            log.error("Cleanup failed: %s", e)
            await asyncio.sleep(60)


async def _heartbeat(manager):
    while True:
        try:
            await asyncio.sleep(30)
            disconnected = []
            for sid, ws in list(manager.active_connections.items()):
                try:
                    await ws.send_json({"type": "ping"})
                except Exception:
                    disconnected.append(sid)
            for sid in disconnected:
                log.info("Heartbeat: disconnected stale session %s", sid)
                await manager.disconnect(sid)
        except Exception as e:
            log.error("Heartbeat failed: %s", e)
            await asyncio.sleep(30)


async def _daily_reset(manager):
    while True:
        try:
            now = now_ufa()
            target = now.replace(hour=1, minute=0, second=0, microsecond=0)
            if target <= now:
                target += timedelta(days=1)
            wait_seconds = (target - now).total_seconds()
            log.info("Daily reset scheduled in %.1f hours", wait_seconds / 3600)
            await asyncio.sleep(wait_seconds)

            pool = await get_pool()
            async with pool.acquire() as conn:
                await conn.execute("UPDATE users SET is_online = FALSE")

            for sid in list(manager.active_connections.keys()):
                try:
                    await manager.active_connections[sid].close()
                except Exception as e:
                    log.debug("Close session %s failed: %s", sid, e)
            manager.active_connections.clear()
            manager.session_to_user.clear()

            log.info("Daily reset completed")
        except Exception as e:
            log.error("Daily reset failed: %s", e)
            await asyncio.sleep(60)


async def _auto_complete_events(manager):
    while True:
        try:
            await asyncio.sleep(30)
            now = now_ufa().isoformat()
            pool = await get_pool()
            async with pool.acquire() as conn:
                expired = await conn.fetch("""
                    SELECT id FROM events
                    WHERE status = 'active' AND event_time IS NOT NULL AND event_time <= $1
                """, now)
                if expired:
                    for row in expired:
                        await conn.execute("""
                            UPDATE events SET status = 'expired', completed_at = $1,
                                updated_at = $1, is_important = 0, important_at = NULL
                            WHERE id = $2
                        """, now, row['id'])
                        await manager.broadcast({
                            "type": "event_notification",
                            "action": "updated",
                            "event_id": row['id'],
                            "status": "expired"
                        })
        except Exception as e:
            log.error("Auto-complete events failed: %s", e)
            await asyncio.sleep(30)


async def _archive_old_events():
    while True:
        try:
            now = now_ufa()
            target = now.replace(hour=6, minute=0, second=0, microsecond=0)
            if target <= now:
                target += timedelta(days=1)
            wait_seconds = (target - now).total_seconds()
            log.info("Archive events scheduled in %.1f hours", wait_seconds / 3600)
            await asyncio.sleep(wait_seconds)

            one_month_ago = (now_ufa() - timedelta(days=30)).isoformat()
            pool = await get_pool()
            async with pool.acquire() as conn:
                old_events = await conn.fetch("""
                    SELECT e.*, u.display_name as creator_name, c.display_name as completer_name
                    FROM events e
                    JOIN users u ON e.user_id = u.id
                    LEFT JOIN users c ON e.completed_by = c.id
                    WHERE e.status IN ('completed', 'expired')
                      AND e.completed_at IS NOT NULL
                      AND e.completed_at <= $1
                """, one_month_ago)

                if old_events:
                    for event in old_events:
                        await conn.execute("""
                            INSERT INTO event_logs (event_id, user_id, title, description, status,
                                created_at, completed_at, completed_by, event_time, archived_at,
                                creator_name, completer_name)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        """, event['event_id'], event['user_id'], event['title'],
                            event['description'], event['status'], event['created_at'],
                            event['completed_at'], event['completed_by'], event['event_time'],
                            now_ufa().isoformat(), event['creator_name'],
                            event['completer_name'])

                    event_ids = [e['id'] for e in old_events]
                    await conn.execute("DELETE FROM events WHERE id = ANY($1)", event_ids)
                    log.info("Archived %d old events", len(old_events))
        except Exception as e:
            log.error("Archive events failed: %s", e)
            await asyncio.sleep(60)


async def _archive_old_works():
    while True:
        try:
            now = now_ufa()
            target = now.replace(hour=6, minute=0, second=0, microsecond=0)
            if target <= now:
                target += timedelta(days=1)
            wait_seconds = (target - now).total_seconds()
            log.info("Archive works scheduled in %.1f hours", wait_seconds / 3600)
            await asyncio.sleep(wait_seconds)

            one_month_ago = (now_ufa() - timedelta(days=30)).isoformat()
            pool = await get_pool()
            async with pool.acquire() as conn:
                old_works = await conn.fetch("""
                    SELECT w.*, u.display_name as creator_name, c.display_name as completer_name
                    FROM work_notifications w
                    JOIN users u ON w.user_id = u.id
                    LEFT JOIN users c ON w.completed_by = c.id
                    WHERE w.status = 'completed'
                      AND w.completed_at IS NOT NULL
                      AND w.completed_at <= $1
                """, one_month_ago)

                if old_works:
                    for work in old_works:
                        await conn.execute("""
                            INSERT INTO work_logs (work_id, user_id, title, description, status,
                                created_at, completed_at, completed_by, archived_at,
                                creator_name, completer_name)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        """, work['work_id'], work['user_id'], work['title'], work['description'],
                            work['status'], work['created_at'], work['completed_at'],
                            work['completed_by'], now_ufa().isoformat(),
                            work['creator_name'], work['completer_name'])

                    work_ids = [w['id'] for w in old_works]
                    await conn.execute(
                        "DELETE FROM work_notifications WHERE id = ANY($1)", work_ids
                    )
                    log.info("Archived %d old works", len(old_works))
        except Exception as e:
            log.error("Archive works failed: %s", e)
            await asyncio.sleep(60)
