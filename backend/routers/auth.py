"""
Auth endpoints — логин.
"""

import hashlib
import logging

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_pool
from schemas import AdminLoginResponse, LoginRequest, LoginResponse

log = logging.getLogger("uchat")
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/api/auth/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest):
    pool = await get_pool()
    async with pool.acquire() as conn:
        password_hash = hashlib.sha256(data.password.encode()).hexdigest()
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE username = $1 AND password_hash = $2",
            data.username, password_hash
        )

        if not user:
            log.warning("Login failed: %s", data.username)
            raise HTTPException(status_code=401, detail="Invalid credentials")

        log.info("Login: %s (id=%d)", data.username, user["id"])
        return LoginResponse(
            id=user["id"],
            username=user["username"],
            display_name=user["display_name"],
            is_admin=bool(user["is_admin"])
        )


@router.post("/api/admin/login", response_model=AdminLoginResponse)
@limiter.limit("5/minute")
async def admin_login(request: Request, data: LoginRequest):
    pool = await get_pool()
    async with pool.acquire() as conn:
        password_hash = hashlib.sha256(data.password.encode()).hexdigest()
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE username = $1 AND password_hash = $2 "
            "AND is_admin = TRUE",
            data.username, password_hash
        )

    if not user:
        log.warning("Admin login failed: %s", data.username)
        raise HTTPException(status_code=401, detail="Invalid credentials or not admin")

    log.info("Admin login: %s", data.username)
    return AdminLoginResponse(username=data.username)
