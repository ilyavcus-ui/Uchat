"""
Конфигурация приложения — чтение переменных окружения.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/workchat"
)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = Path(__file__).parent
DIST_DIR = Path(__file__).parent.parent / "frontend" / "dist"
