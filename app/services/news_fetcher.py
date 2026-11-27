"""RSS feed fetching service using feedparser."""

import logging
import hashlib
from urllib.parse import urlparse
from typing import List, Dict, Any, Optional

import feedparser
import requests

from app.config import RSS_FEEDS, REQUEST_TIMEOUT, USER_AGENT

logger = logging.getLogger(__name__)


def compute_fingerprint(url: str, title: str) -> str:
    """Compute a unique fingerprint for an article based on URL and title."""
    base = f"{url}|{title}".encode("utf-8")
    return hashlib.sha256(base).hexdigest()


def normalize_url(url: str) -> str:
    """Normalize a URL by stripping tracking parameters and fragments."""
    try:
        parsed = urlparse(url.strip())
        # Reconstruct without fragment
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        if parsed.query:
            normalized += f"?{parsed.query}"
        return normalized.rstrip("/")
    except Exception:
        return url.strip()


def extract_source(entry: Dict[str, Any], feed_title: Optional[str] = None) -> Optional[str]:
    """Extract publisher/source name from RSS entry metadata."""
    # Try various source fields
    source = (
        entry.get("source", {}).get("title")
        if isinstance(entry.get("source"), dict)
        else entry.get("source")
    )
    if source:
        return str(source).strip()

    # Fall back to feed title
    if feed_title:
        return feed_title.strip()

    return None


def extract_image_url(entry: Dict[str, Any]) -> Optional[str]:
    """Extract image URL from RSS entry if available."""
    # Try media_content
    media_content = entry.get("media_content")
    if media_content and isinstance(media_content, list):
        for item in media_content:
            if item.get("url"):
                return item["url"]

    # Try media_thumbnail
    media_thumbnail = entry.get("media_thumbnail")
    if media_thumbnail and isinstance(media_thumbnail, list):
        for item in media_thumbnail:
            if item.get("url"):
                return item["url"]

    # Try enclosure
    enclosures = entry.get("enclosures")
    if enclosures and isinstance(enclosures, list):
        for enc in enclosures:
            if enc.get("type", "").startswith("image/") and enc.get("url"):
                return enc["url"]

    # Try links with image type
    links = entry.get("links")
    if links and isinstance(links, list):
        for link in links:
            if link.get("type", "").startswith("image/") and link.get("href"):
                return link["href"]

    return None


def fetch_feed(feed_config: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch a single RSS feed and return parsed articles with metadata.

    Returns a dict with:
        - category: str
        - source: str (feed title)
        - articles: list of article dicts
        - error: Optional[str]
        - success: bool
    """
    result = {
        "category": feed_config["category"],
        "feed_id": feed_config["id"],
        "source": feed_config.get("name", ""),
        "articles": [],
        "error": None,
        "success": False,
    }

    try:
        headers = {"User-Agent": USER_AGENT}
        response = requests.get(
            feed_config["url"],
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()

        feed = feedparser.parse(response.content)

        if feed.bozo and not feed.entries:
            result["error"] = f"Failed to parse feed: {feed.bozo_exception}"
            logger.warning(
                "Feed parse warning for %s: %s",
                feed_config["url"],
                feed.bozo_exception,
            )

        feed_title = None
        if hasattr(feed, "feed") and isinstance(feed.feed, dict):
            feed_title = feed.feed.get("title")

        for entry in feed.entries:
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()

            if not title or not link:
                continue

            normalized_link = normalize_url(link)
            if not normalized_link:
                continue

            # Validate URL scheme
            parsed = urlparse(normalized_link)
            if parsed.scheme not in ("http", "https"):
                continue

            published_at = entry.get("published") or entry.get("updated")
            summary = entry.get("summary") or entry.get("description")
            if summary:
                # Basic HTML stripping for safety
                import re
                summary = re.sub(r"<[^>]+>", "", summary).strip()

            fingerprint = compute_fingerprint(normalized_link, title)

            article = {
                "title": title,
                "url": normalized_link,
                "source": extract_source(entry, feed_title),
                "category": feed_config["category"],
                "published_at": published_at,
                "summary": summary,
                "image_url": extract_image_url(entry),
                "fingerprint": fingerprint,
            }
            result["articles"].append(article)

        result["success"] = True
        logger.info(
            "Fetched %d articles from %s (%s)",
            len(result["articles"]),
            feed_config["name"],
            feed_config["category"],
        )

    except requests.exceptions.Timeout:
        result["error"] = "Request timeout"
        logger.error("Timeout fetching feed %s", feed_config["url"])
    except requests.exceptions.RequestException as e:
        result["error"] = str(e)
        logger.error("Request error fetching feed %s: %s", feed_config["url"], e)
    except Exception as e:
        result["error"] = str(e)
        logger.exception("Unexpected error fetching feed %s", feed_config["url"])

    return result


def fetch_all_feeds() -> List[Dict[str, Any]]:
    """Fetch all configured RSS feeds and return results for each."""
    results = []
    for feed_config in RSS_FEEDS:
        result = fetch_feed(feed_config)
        results.append(result)
    return results
