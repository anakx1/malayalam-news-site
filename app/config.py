# Malayalam News Hub - Configuration

# RSS Feed Sources with Malayalam language, India region
RSS_FEEDS = [
    {
        "id": "top",
        "name": "പ്രധാന വാർത്തകൾ",
        "name_en": "Top News",
        "url": "https://news.google.com/rss?hl=ml&gl=IN&ceid=IN:ml",
        "category": "top",
    },
    {
        "id": "kerala",
        "name": "കേരളം",
        "name_en": "Kerala",
        "url": "https://news.google.com/rss/search?q=Kerala&hl=ml&gl=IN&ceid=IN:ml",
        "category": "kerala",
    },
    {
        "id": "politics",
        "name": "രാഷ്ട്രീയം",
        "name_en": "Politics",
        "url": "https://news.google.com/rss/search?q=Kerala+politics&hl=ml&gl=IN&ceid=IN:ml",
        "category": "politics",
    },
    {
        "id": "india",
        "name": "ഇന്ത്യ",
        "name_en": "India",
        "url": "https://news.google.com/rss/search?q=India&hl=ml&gl=IN&ceid=IN:ml",
        "category": "india",
    },
    {
        "id": "world",
        "name": "ലോകം",
        "name_en": "World",
        "url": "https://news.google.com/rss/search?q=world&hl=ml&gl=IN&ceid=IN:ml",
        "category": "world",
    },
    {
        "id": "sports",
        "name": "കായികം",
        "name_en": "Sports",
        "url": "https://news.google.com/rss/search?q=Kerala+sports&hl=ml&gl=IN&ceid=IN:ml",
        "category": "sports",
    },
    {
        "id": "entertainment",
        "name": "സിനിമ",
        "name_en": "Entertainment",
        "url": "https://news.google.com/rss/search?q=Malayalam+cinema&hl=ml&gl=IN&ceid=IN:ml",
        "category": "entertainment",
    },
    {
        "id": "technology",
        "name": "ടെക്നോളജി",
        "name_en": "Technology",
        "url": "https://news.google.com/rss/search?q=technology&hl=ml&gl=IN&ceid=IN:ml",
        "category": "technology",
    },
]

# Database settings
DATABASE_PATH = "data/news.db"
LOGS_PATH = "logs"

# Application settings
APP_HOST = "0.0.0.0"
APP_PORT = 8000
APP_DEBUG = False

# Scheduler settings
REFRESH_INTERVAL_MINUTES = 15

# Fetch settings
REQUEST_TIMEOUT = 15
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# Article retention settings
MAX_ARTICLES_PER_CATEGORY = 200
ARTICLE_RETENTION_DAYS = 30

# Timezone
TIMEZONE = "Asia/Kolkata"
