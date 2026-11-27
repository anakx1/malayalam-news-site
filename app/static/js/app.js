// Malayalam News Hub — Refined Frontend JavaScript

const API_BASE = '/api';
const PAGE_SIZE = 24;
const CATEGORIES = [
    { id: 'top', name: 'പ്രധാന വാർത്തകൾ', name_en: 'Top News' },
    { id: 'kerala', name: 'കേരളം', name_en: 'Kerala' },
    { id: 'politics', name: 'രാഷ്ട്രീയം', name_en: 'Politics' },
    { id: 'india', name: 'ഇന്ത്യ', name_en: 'India' },
    { id: 'world', name: 'ലോകം', name_en: 'World' },
    { id: 'sports', name: 'കായികം', name_en: 'Sports' },
    { id: 'entertainment', name: 'സിനിമ', name_en: 'Entertainment' },
    { id: 'technology', name: 'ടെക്നോളജി', name_en: 'Technology' },
];

let currentCategory = 'all';
let currentSearch = '';
let currentPage = 1;
let allArticles = [];
let totalArticles = 0;
let isRefreshing = false;
let bookmarks = new Set(JSON.parse(localStorage.getItem('mnh_bookmarks') || '[]'));

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    updateCurrentDate();
    initDarkMode();
    renderCategories();
    renderMobileCategories();
    loadNews();
    loadRefreshStatus();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }

    // Back to top
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
    }
});

// ── Dark Mode ──
function initDarkMode() {
    const saved = localStorage.getItem('mnh_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkMode = saved === null ? prefersDark : saved === 'dark';
    const html = document.documentElement;
    const btn = document.getElementById('themeToggle');
    if (darkMode) html.classList.add('dark'); else html.classList.remove('dark');
    updateThemeIcon(btn, darkMode);
    if (btn) btn.addEventListener('click', () => {
        const isDark = html.classList.toggle('dark');
        updateThemeIcon(btn, isDark);
        localStorage.setItem('mnh_theme', isDark ? 'dark' : 'light');
    });
}
function updateThemeIcon(btn, isDark) {
    const sun = btn.querySelector('#themeIconSun');
    const moon = btn.querySelector('#themeIconMoon');
    if (sun && moon) {
        if (isDark) { sun.style.display = 'none'; moon.style.display = 'block'; }
        else { sun.style.display = 'block'; moon.style.display = 'none'; }
    }
    lucide.createIcons();
}

// ── Date ──
function updateCurrentDate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ml-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const el = document.getElementById('currentDate');
    if (el) el.textContent = dateStr;
}

// ── Categories ──
function renderCategories() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;
    container.innerHTML = '';
    const allBtn = makeCatBtn('എല്ലāvും', 'all', currentCategory === 'all');
    container.appendChild(allBtn);
    CATEGORIES.forEach(cat => {
        container.appendChild(makeCatBtn(cat.name, cat.id, currentCategory === cat.id));
    });
}
function makeCatBtn(text, id, active) {
    const btn = document.createElement('button');
    btn.className = `cat-btn ${active ? 'active' : ''}`;
    btn.textContent = text;
    btn.onclick = () => setCategory(id);
    return btn;
}
function renderMobileCategories() {
    const container = document.getElementById('mobileCategories');
    if (!container) return;
    container.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between px-3 py-3 rounded-lg hover:bg-red-light dark:hover:bg-white/10 transition-colors cursor-pointer border border-border';
        item.innerHTML = `<span class="font-medium malayalam-text">${cat.name}</span><span class="text-xs text-muted">${cat.name_en}</span>`;
        item.onclick = () => { setCategory(cat.id); closeMobileDrawer(); };
        container.appendChild(item);
    });
}

// ── Category / Search ──
function setCategory(category) {
    currentCategory = category;
    currentSearch = '';
    currentPage = 1;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    // update active states
    document.querySelectorAll('.cat-btn').forEach(b => {
        const active = b.textContent.trim() === 'എല്ലāvും' ? category === 'all' : b.dataset.cat === category;
        // simpler: use dataset
    });
    // re-render to highlight
    renderCategories();
    loadNews();
}
function handleSearchInput(e) {
    currentSearch = e.target.value.trim();
    currentPage = 1;
    loadNews();
}
function clearSearch() {
    currentSearch = '';
    const el = document.getElementById('searchInput');
    if (el) el.value = '';
    loadNews();
}

// ── Drawer ──
function openMobileDrawer() {
    document.getElementById('mobileDrawer').classList.remove('translate-x-full');
    document.getElementById('mobileDrawerOverlay').classList.remove('hidden');
}
function closeMobileDrawer() {
    document.getElementById('mobileDrawer').classList.add('translate-x-full');
    document.getElementById('mobileDrawerOverlay').classList.add('hidden');
}

// ── News Loading ──
async function loadNews() {
    showLoading();
    hideError(); hideEmpty();
    try {
        const params = new URLSearchParams();
        if (currentCategory && currentCategory !== 'all') params.set('category', currentCategory);
        if (currentSearch) params.set('search', currentSearch);
        params.set('limit', PAGE_SIZE);
        params.set('offset', (currentPage - 1) * PAGE_SIZE);
        const res = await fetch(`${API_BASE}/news?${params}`);
        if (!res.ok) throw new Error('Failed to load news');
        const data = await res.json();
        allArticles = data.articles;
        totalArticles = data.total;
        hideLoading();
        renderNews(data.articles, data.total);
    } catch (err) {
        hideLoading();
        showError(err.message);
    }
}

async function loadRefreshStatus() {
    try {
        const res = await fetch(`${API_BASE}/status`);
        if (!res.ok) throw new Error('status failed');
        const data = await res.json();
        const el = document.getElementById('lastUpdated') || document.getElementById('refreshStatusText');
        if (el) {
            if (data.last_update) el.textContent = `അപ്‌ഡേറ്റ്: ${formatRelativeTime(new Date(data.last_update))}`;
            else el.textContent = 'അപ്‌ഡേറ്റ് ചെയ്തിട്ടില്ല';
        }
    } catch (e) { console.error('status load failed', e); }
}

// ── Render ──
function renderNews(articles, total) {
    const feed = document.getElementById('newsFeed');
    const featured = document.getElementById('featuredSection');
    const empty = document.getElementById('emptyState');
    if (!feed) return;

    if (!articles || articles.length === 0) {
        feed.innerHTML = ''; featured.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    // Featured = first article
    const first = articles[0];
    const rest = articles.slice(1);
    featured.innerHTML = renderHero(first);

    // Rest as grid
    feed.innerHTML = rest.map((a, i) => renderCard(a, i)).join('');
    lucide.createIcons();
    setupBookmarkToggles();
}

function renderHero(a) {
    const img = a.image_url ? `<img src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.title)}" loading="lazy">`
        : `<div class="hero-media-placeholder">📰</div>`;
    return `
    <article class="hero-card fade-in">
        <div class="hero-media">${img}</div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-meta">
                <span class="hero-pill">${escapeHtml(a.category || 'top')}</span>
                <span>${formatRelativeTime(a.published_at)}</span>
            </div>
            <h2 class="hero-title malayalam-text">${escapeHtml(a.title)}</h2>
            <div class="hero-footer">
                <span>${escapeHtml(a.source || 'അജ്ഞാതം')}</span>
                <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer" class="hero-link">വായിക്കുക <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="18 6 12 2 6 6"/></svg></a>
                ${renderBookmarkBtn(a)}
            </div>
        </div>
    </article>`;
}

function renderCard(a, i) {
    const isBookmarked = bookmarks.has(a.url);
    const img = a.image_url ? `<img src="${escapeHtml(a.image_url)}" alt="" loading="lazy">`
        : `<div class="news-thumb-placeholder">📰</div>`;
    return `
    <article class="news-card fade-in" style="animation-delay: ${i * 60}ms">
        <div class="news-thumb">${img}</div>
        <div class="news-body">
            <div class="news-meta">
                <span class="news-pill">${escapeHtml(a.category || 'top')}</span>
                <span class="news-time">${formatRelativeTime(a.published_at)}</span>
            </div>
            <h3 class="news-title malayalam-text">${escapeHtml(a.title)}</h3>
            <div class="news-source">${escapeHtml(a.source || 'അജ്ഞാതം')}</div>
            ${a.summary ? `<p class="news-summary malayalam-text">${escapeHtml(a.summary)}</p>` : ''}
            <div class="news-action">
                <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">വായിക്കുക <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="18 6 12 2 6 6"/></svg></a>
                <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-url="${escapeHtml(a.url)}" title="${isBookmarked ? 'ബുക്ക്‌മാർക്ക് നീക്കം ചെയ്യുക' : 'ബുക്ക്‌മാർക്ക് ചെയ്യുക'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </button>
            </div>
        </div>
    </article>`;
}

function renderBookmarkBtn(a) {
    const isBookmarked = bookmarks.has(a.url);
    return `
    <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-url="${escapeHtml(a.url)}" aria-label="${isBookmarked ? 'ബുക്ക്‌മാർക്ക് നീക്കം ചെയ്യുക' : 'ബുക്ക്‌മാർക്ക് ചെയ്യുക'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>`;
}

function setupBookmarkToggles() {
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = btn.getAttribute('data-url');
            if (bookmarks.has(url)) { bookmarks.delete(url); btn.classList.remove('active'); }
            else { bookmarks.add(url); btn.classList.add('active'); }
            localStorage.setItem('mnh_bookmarks', JSON.stringify([...bookmarks]));
        };
    });
}

// ── Refresh ──
async function handleRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    const btn = document.getElementById('refreshBtn');
    const badge = document.getElementById('refreshStatus');
    const badgeText = document.getElementById('refreshStatusText');
    const spinner = badge.querySelector('.status-spinner');
    if (btn) { btn.classList.add('ring-2', 'ring-red'); btn.disabled = true; }
    if (badge) { badge.className = 'refresh-badge loading'; badge.classList.remove('hidden'); }
    if (badgeText) badgeText.textContent = 'പുതുക്കുന്നു...';
    if (spinner) spinner.style.display = 'block';

    try {
        const res = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
        if (!res.ok) throw new Error('Refresh failed');
        const result = await res.json();
        if (badgeText) {
            badgeText.textContent = result.message;
            badge.className = 'refresh-badge success';
        }
        await loadNews();
        await loadRefreshStatus();
        setTimeout(() => {
            if (badge) badge.className = 'refresh-badge idle';
            if (badgeText) badgeText.textContent = 'ലഭ്യമാണ്';
            if (spinner) spinner.style.display = 'none';
        }, 3500);
    } catch (err) {
        if (badgeText) badgeText.textContent = 'പുതുക്കാൻ കഴിഞ്ഞില്ല';
        if (badge) badge.className = 'refresh-badge error';
        setTimeout(() => { if (badge) badge.classList.add('hidden'); }, 3000);
    } finally {
        isRefreshing = false;
        if (btn) { btn.classList.remove('ring-2', 'ring-red'); btn.disabled = false; }
        lucide.createIcons();
    }
}

// ── UI Helpers ──
function showLoading() { const el = document.getElementById('loadingSkeletons'); if (el) el.classList.remove('hidden'); }
function hideLoading() { const el = document.getElementById('loadingSkeletons'); if (el) el.classList.add('hidden'); }
function showError(msg) {
    const el = document.getElementById('errorState'); const msgEl = document.getElementById('errorMessage');
    if (el) el.classList.remove('hidden');
    if (msgEl && msg) msgEl.textContent = msg;
    document.getElementById('newsFeed').innerHTML = '';
    document.getElementById('featuredSection').innerHTML = '';
}
function hideError() { const el = document.getElementById('errorState'); if (el) el.classList.add('hidden'); }
function hideEmpty() { const el = document.getElementById('emptyState'); if (el) el.classList.add('hidden'); }

// ── Helpers ──
function formatRelativeTime(dateString) {
    if (!dateString) return 'സമയം അറിയില്ല';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'ഇപ്പോൾ';
        if (diffMins < 60) return `${diffMins} മിനിറ്റ് മുമ്പ്`;
        if (diffHours < 24) return `${diffHours} മണിക്കൂർ മുമ്പ്`;
        if (diffDays < 7) return `${diffDays} ദിവസം മുമ്പ്`;
        return date.toLocaleDateString('ml-IN');
    } catch { return 'സമയം അറിയില്ല'; }
}
function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}
function debounce(fn, wait) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// ── Expose for inline handlers ──
window.handleRefresh = handleRefresh;
window.clearSearch = clearSearch;
window.openMobileDrawer = openMobileDrawer;
window.closeMobileDrawer = closeMobileDrawer;
