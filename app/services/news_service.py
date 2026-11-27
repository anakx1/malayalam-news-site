"""News service layer: business logic for article processing and storage."""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from app.database import (
    get_connection,
    insert_article,
    get_articles,
    get_article_count,
    get_categories,
    log_refresh_start,
    log_refresh_complete,
    get_last_refresh_status,
    cleanup_old_articles,
)
from app.config import (
    RSS_FEEDS,
    MAX_ARTICLES_PER_CATEGORY,
    ARTICLE_RETENTION_DAYS,
)
from app.services.news_fetcher import fetch_all_feeds

logger = logging.getLogger(__name__)


def refresh_all_news() -> Dict[str, Any]:
    """Fetch all RSS feeds, deduplicate, and store new articles.

    Returns a summary dict with counts and status.
    """
    with get_connection() as conn:
        log_id = log_refresh_start(conn)

    new_articles_total = 0
    sources_processed = 0
    sources_failed = 0
    details_parts: List[str] = []

    feed_results = fetch_all_feeds()

    with get_connection() as conn:
        for result in feed_results:
            category = result["category"]
            source_name = result["source"] or category

            if not result["success"]:
                sources_failed += 1
                details_parts.append(
                    f"{source_name}: failed ({result.get('error', 'unknown error')})"
                )
                logger.error(
                    "Feed %s failed: %s", source_name, result.get("error")
                )
                continue

            articles = result["articles"]
            inserted_for_source = 0

            for article in articles:
                try:
                    fetched_at = datetime.now(timezone.utc).isoformat()
                    inserted = insert_article(
                        conn=conn,
                        title=article["title"],
                        url=article["url"],
                        source=article.get("source"),
                        category=article["category"],
                        published_at=article.get("published_at"),
                        fetched_at=fetched_at,
                        summary=article.get("summary"),
                        image_url=article.get("image_url"),
                        fingerprint=article["fingerprint"],
                    )
                    if inserted:
                        inserted_for_source += 1
                except Exception as e:
                    logger.exception(
                        "Error inserting article '%s': %s",
                        article.get("title", ""),
                        e,
                    )

            new_articles_total += inserted_for_source
            sources_processed += 1
            details_parts.append(
                f"{source_name}: {inserted_for_source} new of {len(articles)} fetched"
            )
            logger.info(
                "Category %s: %d new articles inserted",
                category,
                inserted_for_source,
            )

        # Run cleanup
        try:
            deleted = cleanup_old_articles(
                conn,
                retention_days=ARTICLE_RETENTION_DAYS,
                max_per_category=MAX_ARTICLES_PER_CATEGORY,
            )
            if deleted:
                logger.info("Cleanup removed %d old articles", deleted)
                details_parts.append(f"cleanup: {deleted} old articles removed")
        except Exception as e:
            logger.exception("Cleanup failed: %s", e)

        status = "completed" if sources_failed == 0 else "completed_with_errors"
        if sources_processed == 0 and sources_failed > 0:
            status = "failed"

        log_refresh_complete(
            conn=conn,
            log_id=log_id,
            status=status,
            new_articles=new_articles_total,
            sources_processed=sources_processed,
            sources_failed=sources_failed,
            details="; ".join(details_parts),
        )

    return {
        "status": status,
        "new_articles": new_articles_total,
        "sources_processed": sources_processed,
        "sources_failed": sources_failed,
        "message": (
            f"Refreshed: {new_articles_total} new articles from "
            f"{sources_processed} sources"
            + (f", {sources_failed} failed" if sources_failed else "")
        ),
        "details": "; ".join(details_parts),
    }


def get_news(
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """Get articles with optional filtering. Returns (articles, total_count)."""
    with get_connection() as conn:
        rows = get_articles(
            conn=conn,
            category=category,
            search=search,
            limit=limit,
            offset=offset,
        )
        total = get_article_count(
            conn=conn,
            category=category,
            search=search,
        )

    articles = []
    for row in rows:
        articles.append(
            {
                "id": row["id"],
                "title": row["title"],
                "url": row["url"],
                "source": row["source"],
                "category": row["category"],
                "published_at": row["published_at"],
                "fetched_at": row["fetched_at"],
                "summary": row["summary"],
                "image_url": row["image_url"],
                "fingerprint": row["fingerprint"],
            }
        )

    return articles, total


def get_available_categories() -> List[Dict[str, str]]:
    """Return the list of configured categories with names."""
    categories = []
    for feed in RSS_FEEDS:
        categories.append(
            {
                "id": feed["id"],
                "name": feed["name"],
                "name_en": feed["name_en"],
            }
        )
    return categories


def get_refresh_status() -> Optional[Dict[str, Any]]:
    """Get the last refresh status from the database."""
    with get_connection() as conn:
        row = get_last_refresh_status(conn)

    if not row:
        return None

    return {
        "status": row["status"],
        "last_update": row["started_at"],
        "completed_at": row["completed_at"],
        "new_articles": row["new_articles"],
        "sources_processed": row["sources_processed"],
        "sources_failed": row["sources_failed"],
        "details": row["details"],
    }
