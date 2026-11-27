"""API response models (plain dicts for compatibility)."""

from typing import Optional, List, Dict, Any


class Article:
    def __init__(self, id, title, url, source, category, published_at,
                 fetched_at, summary=None, image_url=None, fingerprint=""):
        self.id = id
        self.title = title
        self.url = url
        self.source = source
        self.category = category
        self.published_at = published_at
        self.fetched_at = fetched_at
        self.summary = summary
        self.image_url = image_url
        self.fingerprint = fingerprint

    def dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "url": self.url,
            "source": self.source,
            "category": self.category,
            "published_at": self.published_at,
            "fetched_at": self.fetched_at,
            "summary": self.summary,
            "image_url": self.image_url,
            "fingerprint": self.fingerprint,
        }


class ArticleListResponse:
    def __init__(self, articles: List[Dict], total: int,
                 category: str = "all", search: Optional[str] = None):
        self.articles = articles
        self.total = total
        self.category = category
        self.search = search

    def dict(self) -> Dict[str, Any]:
        return {
            "articles": self.articles,
            "total": self.total,
            "category": self.category,
            "search": self.search,
        }


class CategoryInfo:
    def __init__(self, id: str, name: str, name_en: str):
        self.id = id
        self.name = name
        self.name_en = name_en

    def dict(self) -> Dict[str, str]:
        return {"id": self.id, "name": self.name, "name_en": self.name_en}


class RefreshStatus:
    def __init__(self, status: str, last_update: Optional[str] = None,
                 new_articles: int = 0, sources_processed: int = 0,
                 sources_failed: int = 0, details: Optional[str] = None):
        self.status = status
        self.last_update = last_update
        self.new_articles = new_articles
        self.sources_processed = sources_processed
        self.sources_failed = sources_failed
        self.details = details

    def dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "last_update": self.last_update,
            "new_articles": self.new_articles,
            "sources_processed": self.sources_processed,
            "sources_failed": self.sources_failed,
            "details": self.details,
        }


class RefreshResponse:
    def __init__(self, status: str, new_articles: int,
                 sources_processed: int, sources_failed: int,
                 message: str):
        self.status = status
        self.new_articles = new_articles
        self.sources_processed = sources_processed
        self.sources_failed = sources_failed
        self.message = message

    def dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "new_articles": self.new_articles,
            "sources_processed": self.sources_processed,
            "sources_failed": self.sources_failed,
            "message": self.message,
        }
