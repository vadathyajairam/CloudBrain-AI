"""
database/__init__.py

SQLAlchemy engine, session factory, and DB initialisation.
Default: SQLite (zero-setup).
Production: set DATABASE_URL=postgresql://user:pass@host/db in .env
"""
from __future__ import annotations

import os
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from .models import Base  # noqa: F401 – importing so callers can use Base

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./synexis.db")

# SQLite-specific: enable WAL mode and foreign keys for better concurrency
_connect_args: dict = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):  # type: ignore[no-untyped-def]
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables that don't yet exist. Safe to call on every startup."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:  # type: ignore[return]
    """
    Dependency-injection helper for FastAPI routes.
    Usage:
        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    """Context manager for use outside FastAPI dependency injection."""
    db: Session = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
