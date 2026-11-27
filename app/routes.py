"""Starlette routes for Malayalam News Hub."""

import logging
from typing import Optional

from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse

from app.services.news_service import (
    get_news,
    get_available_categories,
    get_refresh_status,
    refresh_all_news as trigger_refresh_now,
)
from app.services.scheduler import scheduler

logger = logging.getLogger("malayalam_news_hub")


async def homepage(request: Request) -> HTMLResponse:
    """Render the main news page."""
    from app.main import templates
    return templates.TemplateResponse("index.html", {"request": request})


async def api_news(request: Request) -> JSONResponse:
    """Return news articles as JSON."""
    category = request.query_params.get("category")
    search = request.query_params.get("search")
    try:
        limit = int(request.query_params.get("limit", "50"))
    except ValueError:
        limit = 50
    try:
        offset = int(request.query_params.get("offset", "0"))
    except ValueError:
        offset = 0

    articles, total = get_news(
        category=category,
        search=search,
        limit=limit,
        offset=offset,
    )
    return JSONResponse({
        "articles": articles,
        "total": total,
        "category": category or "all",
        "search": search,
    })


async def api_categories(request: Request) -> JSONResponse:
    """Return available categories."""
    return JSONResponse({"categories": get_available_categories()})


async def api_refresh(request: Request) -> JSONResponse:
    """Trigger a manual news refresh."""
    try:
        result = trigger_refresh_now()
        return JSONResponse({
            "status": result["status"],
            "new_articles": result["new_articles"],
            "sources_processed": result["sources_processed"],
            "sources_failed": result["sources_failed"],
            "message": result["message"],
        })
    except Exception:
        logger.exception("Manual refresh failed")
        return JSONResponse(
            {"detail": "Refresh failed"},
            status_code=500,
        )


async def api_status(request: Request) -> JSONResponse:
    """Return update status."""
    status = get_refresh_status()
    if not status:
        return JSONResponse({
            "status": "never",
            "last_update": None,
            "new_articles": 0,
            "sources_processed": 0,
            "sources_failed": 0,
            "details": "No refresh has been performed yet",
            "scheduler_running": scheduler.running,
        })
    return JSONResponse({
        **status,
        "scheduler_running": scheduler.running,
    })


async def health(request: Request) -> JSONResponse:
    """Health check endpoint."""
    return JSONResponse({"status": "ok"})
