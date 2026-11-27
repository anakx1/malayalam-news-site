"""Main application entry point using Starlette."""

import sys
import logging
from contextlib import asynccontextmanager

# Shim for removed 'cgi' module (Python 3.13+) required by feedparser
if "cgi" not in sys.modules:
    from app.cgi_shim import parse_header as _parse_header

    class _cgi:
        parse_header = staticmethod(_parse_header)

    sys.modules["cgi"] = _cgi

from starlette.applications import Starlette
from starlette.routing import Route, Mount
from starlette.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates
from starlette.responses import JSONResponse, HTMLResponse, RedirectResponse
from starlette.requests import Request

from app.config import APP_HOST, APP_PORT, APP_DEBUG
from app.database import init_db
from app.services.scheduler import start_scheduler, stop_scheduler
from app.routes import (
    homepage, api_news, api_categories, api_refresh, api_status, health
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("malayalam_news_hub")

templates = Jinja2Templates(directory="app/templates")


@asynccontextmanager
async def lifespan(app):
    """Application lifespan: initialize DB, start scheduler, cleanup on shutdown."""
    logger.info("Initializing database...")
    init_db()

    logger.info("Performing initial news fetch...")
    try:
        from app.services.news_service import refresh_all_news
        result = refresh_all_news()
        logger.info("Initial fetch: %s", result["message"])
    except Exception:
        logger.exception("Initial news fetch failed")

    logger.info("Starting background scheduler...")
    start_scheduler()

    yield

    logger.info("Shutting down...")
    stop_scheduler()


app = Starlette(
    debug=APP_DEBUG,
    lifespan=lifespan,
    routes=[
        Route("/", endpoint=homepage, methods=["GET"]),
        Route("/api/news", endpoint=api_news, methods=["GET"]),
        Route("/api/categories", endpoint=api_categories, methods=["GET"]),
        Route("/api/refresh", endpoint=api_refresh, methods=["POST"]),
        Route("/api/status", endpoint=api_status, methods=["GET"]),
        Route("/health", endpoint=health, methods=["GET"]),
        Mount("/static", app=StaticFiles(directory="app/static"), name="static"),
    ],
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=APP_HOST,
        port=APP_PORT,
        reload=APP_DEBUG,
    )
