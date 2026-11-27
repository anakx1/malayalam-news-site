// Malayalam News Hub - Frontend JavaScript

const API_BASE = '/api';
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
let allArticles = [];
let isRefreshing = false;

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // Initialize date
    updateCurrentDate();
    
    // Initialize dark mode
    initDarkMode();
    
    // Load categories
    renderCategories();
    renderMobileCategories();
    
    // Load initial news
    loadNews();
    
    // Load refresh status
    loadRefreshStatus();
    
    // Set up search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }
    
    // Back to top button
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.classList.remove('opacity-0');
                backToTop.classList.add('opacity-100');
            } else {
                backToTop.classList.remove('opacity-100');
                backToTop.classList.add('opacity-0');
            }
        });
    }
});

// --- Dark Mode ---
function initDarkMode() {
    const saved = localStorage.getItem('newsTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkMode = saved === null ? prefersDark : saved === 'dark';
    
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    
    if (darkMode) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    
    updateThemeIcon(themeToggle, darkMode);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = html.classList.toggle('dark');
            updateThemeIcon(themeToggle, isDark);
            localStorage.setItem('newsTheme', isDark ? 'dark' : 'light');
        });
    }
}

function updateThemeIcon(btn, isDark) {
    const sunIcon = btn.querySelector('[data-lucide="sun"]');
    const moonIcon = btn.querySelector('[data-lucide="moon"]');
    if (sunIcon && moonIcon) {
        if (isDark) {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }
    lucide.createIcons();
}

// --- Date ---
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('ml-IN', options);
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = dateStr;
    }
}

// --- Categories ---
function renderCategories() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;
    
    // "All" tab
    const allBtn = document.createElement('button');
    allBtn.className = 'category-tab px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 border-transparent';
    allBtn.textContent = 'എല്ലാവും';
    allBtn.dataset.category = 'all';
    if (currentCategory === 'all') {
        allBtn.classList.add('bg-editorial-red/10', 'text-editorial-red', 'border-editorial-red');
    } else {
        allBtn.classList.add('text-editorial-muted', 'hover:text-editorial-charcoal', 'dark:hover:text-white');
    }
    allBtn.onclick = () => setCategory('all');
    container.appendChild(allBtn);
    
    CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-tab px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 border-transparent';
        btn.textContent = cat.name;
        btn.dataset.category = cat.id;
        if (currentCategory === cat.id) {
            btn.classList.add('bg-editorial-red/10', 'text-editorial-red', 'border-editorial-red');
        } else {
            btn.classList.add('text-editorial-muted', 'hover:text-editorial-charcoal', 'dark:hover:text-white');
        }
        btn.onclick = () => setCategory(cat.id);
        container.appendChild(btn);
    });
}

function renderMobileCategories() {
    const container = document.getElementById('mobileCategories');
    if (!container) return;
    
    CATEGORIES.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between px-3 py-3 rounded-lg hover:bg-editorial-paper dark:hover:bg-white/10 transition-colors cursor-pointer border';
        item.innerHTML = `
            <span class="font-medium">${cat.name}</span>
            <span class="text-xs text-editorial-muted">${cat.name_en}</span>
        `;
        item.onclick = () => {
            setCategory(cat.id);
            closeMobileDrawer();
        };
        container.appendChild(item);
    });
}

function setCategory(category) {
    currentCategory = category;
    currentSearch = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    // Update active states
    document.querySelectorAll('.category-tab').forEach(btn => {
        const isActive = btn.dataset.category === category;
        if (isActive) {
            btn.classList.add('bg-editorial-red/10', 'text-editorial-red', 'border-editorial-red');
            btn.classList.remove('text-editorial-muted', 'hover:text-editorial-charcoal', 'dark:hover:text-white');
        } else {
            btn.classList.remove('bg-editorial-red/10', 'text-editorial-red', 'border-editorial-red');
            btn.classList.add('text-editorial-muted', 'hover:text-editorial-charcoal', 'dark:hover:text-white');
        }
    });
    
    loadNews();
}

function openMobileDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer) drawer.classList.remove('translate-x-full');
    if (overlay) overlay.classList.remove('hidden');
}

function closeMobileDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer) drawer.classList.add('translate-x-full');
    if (overlay) overlay.classList.add('hidden');
}

// --- News Loading ---
async function loadNews() {
    showLoading();
    hideError();
    hideEmpty();
    
    try {
        const params = new URLSearchParams();
        if (currentCategory && currentCategory !== 'all') params.set('category', currentCategory);
        if (currentSearch) params.set('search', currentSearch);
        params.set('limit', '50');
        
        const response = await fetch(`${API_BASE}/news?${params}`);
        if (!response.ok) throw new Error('Failed to fetch news');
        
        const data = await response.json();
        allArticles = data.articles;
        
        hideLoading();
        renderNews(data.articles, data.total);
    } catch (err) {
        hideLoading();
        showError(err.message);
    }
}

async function loadRefreshStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        if (!response.ok) throw new Error('Failed to load status');
        const data = await response.json();
        
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            if (data.last_update) {
                lastUpdatedEl.textContent = formatRelativeTime(new Date(data.last_update));
            } else {
                lastUpdatedEl.textContent = 'അപ്‌ഡേറ്റ് ചെയ്തിട്ടില്ല';
            }
        }
    } catch (err) {
        console.error('Failed to load refresh status:', err);
    }
}

// --- Render News ---
function renderNews(articles, total) {
    const newsFeed = document.getElementById('newsFeed');
    const featuredSection = document.getElementById('featuredSection');
    const emptyState = document.getElementById('emptyState');
    
    if (!newsFeed) return;
    
    // Show empty state
    if (!articles || articles.length === 0) {
        newsFeed.innerHTML = '';
        featuredSection.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    // Render featured (first article)
    const featured = articles[0];
    const rest = articles.slice(1);
    
    featuredSection.innerHTML = `
        <article class="group relative rounded-xl overflow-hidden border border-editorial-border dark:border-white/10 bg-white dark:bg-editorial-charcoal/50 hover:border-editorial-red/50 transition-colors">
            <div class="relative h-64 md:h-80">
                ${featured.image_url 
                    ? `<img src="${escapeHtml(featured.image_url)}" alt="${escapeHtml(featured.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
                    : `<div class="w-full h-full bg-gradient-to-b from-transparent to-editorial-charcoal/80"></div>`
                }
                <div class="absolute inset-0 bg-gradient-to-t from-editorial-charcoal/80 via-transparent to-transparent"></div>
                <div class="absolute bottom-0 left-0 right-0 p-6">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-editorial-red text-white mb-3">
                        ${escapeHtml(featured.category || 'top')}
                    </span>
                    <h2 class="text-2xl md:text-3xl font-bold font-malayalam text-white leading-tight mb-2">
                        ${escapeHtml(featured.title)}
                    </h2>
                    <div class="flex items-center gap-3 text-sm text-gray-200">
                        <span>${escapeHtml(featured.source || 'അജ്ഞാതം')}</span>
                        <span class="w-px h-3 bg-gray-500"></span>
                        <span>${formatRelativeTime(featured.published_at)}</span>
                    </div>
                </div>
            </div>
            <a href="${escapeHtml(featured.url)}" target="_blank" rel="noopener noreferrer" class="block p-6 external-link">
                വായിക്കുക →
            </a>
        </article>
    `;
    
    // Render rest as grid
    newsFeed.innerHTML = rest.map((article, index) => `
        <article class="group rounded-xl border border-editorial-border dark:border-white/10 bg-white dark:bg-editorial-charcoal/50 overflow-hidden hover:border-editorial-red/50 transition-colors fade-in" style="animation-delay: ${index * 50}ms">
            <div class="p-5">
                <div class="flex items-start gap-4">
                    ${article.image_url 
                        ? `<img src="${escapeHtml(article.image_url)}" alt="" class="w-24 h-24 object-cover rounded-lg flex-shrink-0">`
                        : `<div class="w-24 h-24 rounded-lg bg-editorial-paper flex items-center justify-center text-editorial-muted flex-shrink-0">
                             <i data-lucide="newspaper" class="w-6 h-6"></i>
                           </div>`
                    }
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-editorial-red/10 text-editorial-red dark:bg-editorial-red/20 dark:text-editorial-red border border-editorial-red/20">
                                ${escapeHtml(article.category || 'top')}
                            </span>
                            <span class="text-xs text-editorial-muted">${formatRelativeTime(article.published_at)}</span>
                        </div>
                        <h3 class="text-lg font-bold font-malayalam text-editorial-charcoal dark:text-white leading-snug mb-2 line-clamp-2">
                            ${escapeHtml(article.title)}
                        </h3>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-xs text-editorial-muted">
                                ${escapeHtml(article.source || 'അജ്ഞാതം')}
                            </div>
                        </div>
                        ${article.summary ? `
                            <p class="mt-2 text-sm text-editorial-muted line-clamp-2">${escapeHtml(article.summary)}</p>
                        ` : ''}
                    </div>
                </div>
            </div>
            <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="block w-full external-link px-5 pb-4 text-center sm:text-left">
                വായിക്കുക →
            </a>
        </article>
    `).join('');
    
    lucide.createIcons();
}

// --- Search ---
function handleSearchInput(e) {
    currentSearch = e.target.value.trim();
    loadNews();
}

function clearSearch() {
    currentSearch = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    loadNews();
}

// --- Refresh ---
async function handleRefresh() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    const btn = document.getElementById('refreshBtn');
    const statusBadge = document.getElementById('refreshStatus');
    const statusText = document.getElementById('refreshStatusText');
    
    // UI loading state
    if (btn) {
        btn.classList.add('btn-loading', 'opacity-75');
        btn.disabled = true;
    }
    if (statusBadge) statusBadge.classList.remove('hidden');
    if (statusText) statusText.textContent = 'പുതുക്കുന്നു...';
    
    try {
        const response = await fetch(`${API_BASE}/refresh`, {
            method: 'POST',
        });
        
        if (!response.ok) throw new Error('Refresh failed');
        
        const result = await response.json();
        
        // Show feedback
        if (statusText) {
            statusText.textContent = result.message;
            statusText.classList.remove('text-editorial-red');
            statusText.classList.add('text-green-600', 'dark:text-green-400');
        }
        
        // Reload news
        await loadNews();
        await loadRefreshStatus();
        
        // Reset status text after delay
        setTimeout(() => {
            if (statusBadge) statusBadge.classList.add('hidden');
            if (statusText) {
                statusText.textContent = 'പുതുക്കുന്നു...';
                statusText.classList.remove('text-green-600', 'dark:text-green-400');
                statusText.classList.add('text-editorial-red');
            }
        }, 4000);
        
    } catch (err) {
        if (statusText) {
            statusText.textContent = 'പുതുക്കാൻ കഴിഞ്ഞില്ല';
            statusText.classList.add('text-editorial-red');
        }
        setTimeout(() => {
            if (statusBadge) statusBadge.classList.add('hidden');
        }, 3000);
    } finally {
        isRefreshing = false;
        if (btn) {
            btn.classList.remove('btn-loading', 'opacity-75');
            btn.disabled = false;
        }
        lucide.createIcons();
    }
}

// --- UI Helpers ---
function showLoading() {
    const el = document.getElementById('loadingSkeletons');
    if (el) el.classList.remove('hidden');
}

function hideLoading() {
    const el = document.getElementById('loadingSkeletons');
    if (el) el.classList.add('hidden');
}

function showError(msg) {
    const el = document.getElementById('errorState');
    const msgEl = document.getElementById('errorMessage');
    if (el) el.classList.remove('hidden');
    if (msgEl && msg) msgEl.textContent = msg;
    document.getElementById('newsFeed').innerHTML = '';
    document.getElementById('featuredSection').innerHTML = '';
}

function hideError() {
    const el = document.getElementById('errorState');
    if (el) el.classList.add('hidden');
}

function hideEmpty() {
    const el = document.getElementById('emptyState');
    if (el) el.classList.add('hidden');
}

// --- Helpers ---
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
    } catch (e) {
        return 'സമയം അറിയില്ല';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Expose to window for inline HTML handlers
window.handleRefresh = handleRefresh;
window.clearSearch = clearSearch;
window.openMobileDrawer = openMobileDrawer;
window.closeMobileDrawer = closeMobileDrawer;
