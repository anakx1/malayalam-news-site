"""Database layer for Malayalam News Hub using SQLite."""

import sqlite3
import os
import logging
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from app.config import DATABASE_PATH

logger = logging.getLogger(__name__)


def get_db_path() -> str:
    """Return the absolute path to the SQLite database file."""
    db_path = DATABASE_PATH
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.getcwd(), db_path)
    return db_path


def ensure_data_dir() -> None:
    """Ensure the directory for the database exists."""
    db_path = get_db_path()
    data_dir = os.path.dirname(db_path)
    if data_dir and not os.path.exists(data_dir):
        os.makedirs(data_dir, exist_ok=True)


@contextmanager
def get_connection():
    """Context manager for SQLite database connections."""
    ensure_data_dir()
    conn = sqlite3.connect(get_db_path(), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Initialize the database schema."""
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                source TEXT,
                category TEXT NOT NULL DEFAULT 'top',
                published_at TEXT,
                fetched_at TEXT NOT NULL,
                summary TEXT,
                image_url TEXT,
                fingerprint TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_articles_category
                ON articles(category);
            CREATE INDEX IF NOT EXISTS idx_articles_published
                ON articles(published_at DESC);
            CREATE INDEX IF NOT EXISTS idx_articles_fetched
                ON articles(fetched_at DESC);
            CREATE INDEX IF NOT EXISTS idx_articles_fingerprint
                ON articles(fingerprint);
            CREATE INDEX IF NOT EXISTS idx_articles_category_published
                ON articles(category, published_at DESC);

            CREATE TABLE IF NOT EXISTS refresh_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                status TEXT NOT NULL,
                new_articles INTEGER DEFAULT 0,
                sources_processed INTEGER DEFAULT 0,
                sources_failed INTEGER DEFAULT 0,
                details TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_refresh_log_started
                ON refresh_log(started_at DESC);
            """
        )


def insert_article(
    conn: sqlite3.Connection,
    title: str,
    url: str,
    source: Optional[str],
    category: str,
    published_at: Optional[str],
    fetched_at: str,
    summary: Optional[str],
    image_url: Optional[str],
    fingerprint: str,
) -> bool:
    """Insert an article into the database. Returns True if inserted, False if duplicate."""
    try:
        conn.execute(
            """
            INSERT INTO articles
                (title, url, source, category, published_at, fetched_at,
                 summary, image_url, fingerprint)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                title,
                url,
                source,
                category,
                published_at,
                fetched_at,
                summary,
                image_url,
                fingerprint,
            ),
        )
        return True
    except sqlite3.IntegrityError:
        # Duplicate URL or fingerprint — skip
        return False


def get_articles(
    conn: sqlite3.Connection,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[sqlite3.Row]:
    """Fetch articles with optional category and search filters."""
    params: List[Any] = []
    query = "SELECT * FROM articles"

    conditions = []
    if category and category != "all":
        conditions.append("category = ?")
        params.append(category)

    if search:
        conditions.append("(title LIKE ? OR summary LIKE ?)")
        like = f"%{search}%"
        params.extend([like, like])

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY published_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cur = conn.execute(query, params)
    return cur.fetchall()


def get_article_count(
    conn: sqlite3.Connection,
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> int:
    """Get count of articles matching filters."""
    params: List[Any] = []
    query = "SELECT COUNT(*) FROM articles"
    conditions = []

    if category and category != "all":
        conditions.append("category = ?")
        params.append(category)

    if search:
        conditions.append("(title LIKE ? OR summary LIKE ?)")
        like = f"%{search}%"
        params.extend([like, like])

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    cur = conn.execute(query, params)
    return cur.fetchone()[0]


def get_categories(conn: sqlite3.Connection) -> List[str]:
    """Return distinct categories present in the database."""
    cur = conn.execute("SELECT DISTINCT category FROM articles ORDER BY category")
    return [row[0] for row in cur.fetchall()]


def log_refresh_start(conn: sqlite3.Connection) -> int:
    """Record the start of a refresh cycle. Returns the log row ID."""
    cur = conn.execute(
        """
        INSERT INTO refresh_log (started_at, status, new_articles, sources_processed, sources_failed)
        VALUES (?, 'in_progress', 0, 0, 0)
        """,
        (datetime.now(timezone.utc).isoformat(),),
    )
    return cur.lastrowid


def log_refresh_complete(
    conn: sqlite3.Connection,
    log_id: int,
    status: str,
    new_articles: int,
    sources_processed: int,
    sources_failed: int,
    details: Optional[str] = None,
) -> None:
    """Mark a refresh cycle as completed."""
    conn.execute(
        """
        UPDATE refresh_log
        SET completed_at = ?, status = ?, new_articles = ?,
            sources_processed = ?, sources_failed = ?, details = ?
        WHERE id = ?
        """,
        (
            datetime.now(timezone.utc).isoformat(),
            status,
            new_articles,
            sources_processed,
            sources_failed,
            details,
            log_id,
        ),
    )


def get_last_refresh_status(conn: sqlite3.Connection) -> Optional[sqlite3.Row]:
    """Return the most recent refresh log entry."""
    cur = conn.execute(
        "SELECT * FROM refresh_log ORDER BY started_at DESC LIMIT 1"
    )
    return cur.fetchone()


def cleanup_old_articles(
    conn: sqlite3.Connection, retention_days: int = 30, max_per_category: int = 200
) -> int:
    """Remove old articles beyond retention limits. Returns count deleted."""
    # Delete articles older than retention_days
    cur = conn.execute(
        """
        DELETE FROM articles
        WHERE fetched_at < datetime('now', ? || ' days')
        """,
        (-retention_days,),
    )
    deleted = cur.rowcount

    # Enforce max per category by deleting oldest beyond limit
    categories = get_categories(conn)
    for cat in categories:
        conn.execute(
            """
            DELETE FROM articles
            WHERE id NOT IN (
                SELECT id FROM articles
                WHERE category = ?
                ORDER BY published_at DESC
                LIMIT ?
            )
            AND category = ?
            """,
            (cat, max_per_category, cat),
        )

    return deleted
