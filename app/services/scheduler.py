"""Background scheduler for automatic news refresh using APScheduler."""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.memory import MemoryJobStore

from app.config import REFRESH_INTERVAL_MINUTES
from app.services.news_service import refresh_all_news

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(
    jobstores={"default": MemoryJobStore()},
    timezone="Asia/Kolkata",
)


def _scheduled_refresh() -> None:
    """Wrapper around refresh_all_news with error logging for scheduler."""
    logger.info("Scheduled news refresh starting...")
    try:
        result = refresh_all_news()
        logger.info(
            "Scheduled refresh completed: %s",
            result["message"],
        )
    except Exception:
        logger.exception("Scheduled refresh failed unexpectedly")


def start_scheduler() -> None:
    """Start the background scheduler if not already running."""
    if scheduler.running:
        logger.warning("Scheduler is already running")
        return

    scheduler.add_job(
        _scheduled_refresh,
        trigger=IntervalTrigger(minutes=REFRESH_INTERVAL_MINUTES),
        id="news_refresh",
        name="Malayalam News Refresh",
        replace_existing=True,
        max_instances=1,  # Prevent overlapping refresh jobs
        coalesce=True,    # Run only once if multiple executions are due
    )
    scheduler.start()
    logger.info(
        "Scheduler started — news refresh every %d minutes",
        REFRESH_INTERVAL_MINUTES,
    )


def stop_scheduler() -> None:
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")


def trigger_refresh_now() -> dict:
    """Manually trigger a news refresh immediately (outside scheduler)."""
    return refresh_all_news()
