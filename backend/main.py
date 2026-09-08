"""
Uchat backend — FastAPI server for corporate chat.
Точка входа: lifespan, WebSocket, static files.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from background import create_background_tasks
from config import CORS_ORIGINS, DIST_DIR, HOST, LOG_DIR, LOG_LEVEL, PORT
from database import close_pool, get_pool, init_db, now_ufa
from routers import admin, auth, events, health, lunches, messages, works
from ws_manager import manager

# ==================== Logging ====================
_log_handlers = [logging.StreamHandler()]
try:
    _log_handlers.insert(0, logging.FileHandler(LOG_DIR / "log.txt", encoding="utf-8"))
except Exception:
    pass
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=_log_handlers,
)
log = logging.getLogger("uchat")

# ==================== Lifespan ====================


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    create_background_tasks(manager)
    yield
    await close_pool()


# ==================== App ====================

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Uchat", version="1.0.0", lifespan=lifespan, state={"limiter": limiter})
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(works.router)
app.include_router(events.router)
app.include_router(messages.router)
app.include_router(lunches.router)
app.include_router(admin.router)

# ==================== WebSocket ====================


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, session_id: str = Query(...), user_id: int = Query(None)
):
    log.info("WebSocket connected: session=%s user_id=%s", session_id, user_id)
    await manager.connect(websocket, session_id, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            log.debug("WS recv: %s", data)
            message_type = data.get("type")

            if message_type == "chat_message":
                content = data.get("content", "")
                receiver_id = data.get("receiver_id")
                sender_id = data.get("sender_id", 1)
                sender_name = data.get("sender_name", "User")

                if receiver_id and receiver_id == sender_id:
                    continue

                pool = await get_pool()
                async with pool.acquire() as conn:
                    message_id = await conn.fetchval("""
                        INSERT INTO messages
                            (sender_id, receiver_id, content, message_type, created_at)
                        VALUES ($1, $2, $3, 'text', $4)
                        RETURNING id
                    """, sender_id, receiver_id, content, now_ufa().isoformat())

                message_data = {
                    "type": "new_message",
                    "message": {
                        "id": message_id,
                        "sender_id": sender_id,
                        "username": sender_name.lower().replace(" ", "_"),
                        "display_name": sender_name,
                        "receiver_id": receiver_id,
                        "content": content,
                        "message_type": "text",
                        "created_at": now_ufa().isoformat()
                    }
                }

                log.debug("WS send: %s", message_data)

                if receiver_id:
                    await manager.send_to_user(receiver_id, message_data)
                    if receiver_id != sender_id:
                        await manager.send_to_user(sender_id, message_data)
                else:
                    await manager.broadcast(message_data)

            elif message_type == "typing":
                receiver_id = data.get("receiver_id")
                typing_data = {"type": "typing", "display_name": data.get("sender_name", "User")}

                if receiver_id:
                    await manager.send_to_user(receiver_id, typing_data)
                else:
                    await manager.broadcast(typing_data, exclude_session=session_id)

    except WebSocketDisconnect:
        log.info("WebSocket disconnected: session=%s", session_id)
        await manager.disconnect(session_id)
    except Exception as e:
        log.error("WebSocket error session=%s: %s", session_id, e)
        await manager.disconnect(session_id)

# ==================== Static Files ====================

app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

_NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}


@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404)
    file_path = DIST_DIR / full_path
    if file_path.is_file():
        return FileResponse(file_path, headers=_NO_CACHE_HEADERS)
    return FileResponse(DIST_DIR / "index.html", headers=_NO_CACHE_HEADERS)


if __name__ == "__main__":
    import uvicorn
    log.info("Starting Uchat on %s:%s", HOST, PORT)
    log.info("WebSocket endpoint: ws://%s:%s/ws", HOST, PORT)
    uvicorn.run(app, host=HOST, port=PORT)
