from pydantic import BaseModel, Field
from typing import Optional


# ==================== Auth ====================

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)


class LoginResponse(BaseModel):
    id: int
    username: str
    display_name: str
    is_admin: bool


class AdminLoginResponse(BaseModel):
    status: str = "ok"
    username: str


# ==================== Users ====================

class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=100)
    is_admin: bool = False


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    is_admin: bool
    is_online: Optional[bool] = None
    last_message_at: Optional[str] = None
    created_at: Optional[str] = None


# ==================== Works ====================

class WorkCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=2000)
    description: str = ""
    user_id: int


class WorkUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|completed|cancelled)$")
    completed_by: Optional[int] = None
    is_important: Optional[int] = None


# ==================== Events ====================

class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=2000)
    description: str = ""
    user_id: int
    event_time: Optional[str] = None


class EventUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|completed|cancelled)$")
    completed_by: Optional[int] = None
    is_important: Optional[int] = None


# ==================== Comments ====================

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    user_id: int


# ==================== Lunches ====================

class LunchCreate(BaseModel):
    user_id: int
    lunch_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    lunch_hour: int = Field(..., ge=9, le=19)


# ==================== Common ====================

class StatusResponse(BaseModel):
    status: str = "ok"


class IdResponse(BaseModel):
    id: int
    status: str = "ok"
