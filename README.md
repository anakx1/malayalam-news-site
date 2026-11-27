# Malayalam News Hub

A modern, mobile-first Malayalam news aggregator web application built with Python, FastAPI, and Tailwind CSS.

## Features

- **Live Malayalam news** from Google News RSS feeds (India region)
- **8 categories**: Top News, Kerala, Politics, India, World, Sports, Entertainment, Technology
- **Automatic background refresh** every 15 minutes via APScheduler
- **Manual refresh** with loading state and feedback
- **Search** with debounced input
- **Dark mode** with persistent preference
- **Responsive design** — mobile-first, works from 320px to desktop
- **SQLite persistence** with deduplication
- **Relative timestamps** (e.g., "5 മിനിറ്റ് മുമ്പ്")
- **Article links open in new tab**

## Tech Stack

- **Backend:** Python 3 + FastAPI
- **Templates:** Jinja2
- **Database:** SQLite
- **News Parsing:** feedparser
- **Background Scheduler:** APScheduler
- **Frontend:** HTML5, Tailwind CSS (CDN), Vanilla JavaScript
- **Icons:** Lucide
- **Typography:** Noto Sans Malayalam + Inter

## Project Structure

```
malayalam-news-site/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app + lifespan
│   ├── config.py        # Configuration & RSS feeds
│   ├── database.py      # SQLite layer
│   ├── models.py        # Pydantic models
│   ├── routes.py        # API routes
│   ├── services/
│   │   ├── __init__.py
│   │   ├── news_fetcher.py   # RSS fetching
│   │   ├── news_service.py   # Business logic
│   │   └── scheduler.py      # APScheduler
│   ├── templates/
│   │   ├── base.html
│   │   └── index.html
│   └── static/
│       ├── css/styles.css
│       └── js/app.js
├── data/
│   └── news.db
├── logs/
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
└── run.sh
```

## Installation & Launch

### 1. Create virtual environment and install dependencies

```bash
cd malayalam-news-site
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the application

```bash
chmod +x run.sh
./run.sh
```

Or run directly with uvicorn:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Access the application

- Local: http://127.0.0.1:8000
- LAN: http://YOUR-LAN-IP:8000 (from other devices on the same Wi-Fi)

To find your LAN IP on Termux:
```bash
ifconfig wlan0   # or ip addr show wlan0
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main news page |
| `/api/news` | GET | Articles (supports `category`, `search`, `limit`, `offset`) |
| `/api/categories` | GET | Available categories |
| `/api/refresh` | POST | Trigger manual refresh |
| `/api/status` | GET | Refresh status & last update |
| `/health` | GET | Health check |

## Environment Variables

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

## Testing Checklist

- [x] Application starts successfully
- [x] Main page renders
- [x] Database initializes correctly
- [x] RSS feeds are fetched
- [x] Articles are stored
- [x] Duplicate articles are filtered
- [x] Category filtering works
- [x] Search works
- [x] Manual refresh works
- [x] Background refresh scheduler starts
- [x] Dark mode works and persists
- [x] Mobile layout is responsive
- [x] Article links work
- [x] Error states are handled
- [x] API endpoints return valid responses

## License

MIT
