// ==========================================================================
// App State
// ==========================================================================
let state = {
    releases: [],
    filteredReleases: [],
    selectedId: null,
    searchQuery: '',
    typeFilter: 'all',
    lastUpdated: null
};

// ==========================================================================
// DOM Elements
// ==========================================================================
const DOM = {
    refreshBtn: document.getElementById('refresh-button'),
    retryBtn: document.getElementById('retry-button'),
    refreshSpinner: document.getElementById('refresh-spinner'),
    lastUpdatedText: document.getElementById('last-updated'),
    searchInput: document.getElementById('search-input'),
    typeFilter: document.getElementById('type-filter'),
    resultsCount: document.getElementById('results-count'),
    feedContainer: document.getElementById('feed-container'),
    exportCsvBtn: document.getElementById('export-csv-button'),
    
    // States
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    emptyState: document.getElementById('empty-state'),
    
    // Details Panel
    detailsPanel: document.getElementById('details-panel'),
    detailsEmpty: document.getElementById('details-empty'),
    detailsContent: document.getElementById('details-content'),
    detailTitle: document.getElementById('detail-title'),
    detailDate: document.getElementById('detail-date'),
    detailBadge: document.getElementById('detail-badge'),
    detailLink: document.getElementById('detail-link'),
    detailBody: document.getElementById('detail-body'),
    
    // Tweet Composer
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    copyBtn: document.getElementById('copy-button'),
    tweetBtn: document.getElementById('tweet-button'),
    tagButtons: document.querySelectorAll('.tag-btn')
};

// ==========================================================================
// Helper Functions
// ==========================================================================

// Infer the type of release note based on title and content keywords
function inferReleaseType(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('deprecated') || text.includes('deprecation') || text.includes('retire') || text.includes('removal')) {
        return 'deprecated';
    }
    if (text.includes('fix') || text.includes('resolved') || text.includes('bug') || text.includes('correct') || text.includes('issue')) {
        return 'fixed';
    }
    if (text.includes('feature') || text.includes('new') || text.includes('added') || text.includes('introduced') || text.includes('support for') || text.includes('beta') || text.includes('general availability') || text.includes('ga ')) {
        return 'feature';
    }
    if (text.includes('change') || text.includes('changed') || text.includes('updated') || text.includes('improvement') || text.includes('optimize') || text.includes('modify')) {
        return 'change';
    }
    
    return 'general';
}

function getBadgeClass(type) {
    switch(type) {
        case 'feature': return 'badge-feature';
        case 'change': return 'badge-change';
        case 'deprecated': return 'badge-deprecated';
        case 'fixed': return 'badge-fixed';
        default: return 'badge-general';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return 'Unknown Date';
    try {
        const date = new Date(dateStr);
        // Format: June 16, 2026
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

// Clean HTML content to create a plain text preview
function stripHtml(htmlStr) {
    let doc = new DOMParser().parseFromString(htmlStr, 'text/html');
    return doc.body.textContent || "";
}

// ==========================================================================
// Data Fetching & Rendering
// ==========================================================================

async function fetchReleaseNotes() {
    // Show loading spinner
    DOM.refreshSpinner.classList.add('spinning');
    DOM.refreshBtn.disabled = true;
    
    // If we have no releases, show main loading page
    if (state.releases.length === 0) {
        DOM.loadingState.classList.remove('hidden');
        DOM.feedContainer.classList.add('hidden');
        DOM.errorState.classList.add('hidden');
        DOM.emptyState.classList.add('hidden');
    }
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.status === 'success') {
            state.releases = data.releases.map(item => {
                const inferredType = inferReleaseType(item.title, item.content);
                return {
                    ...item,
                    inferredType: inferredType
                };
            });
            
            state.lastUpdated = new Date();
            updateLastUpdatedTime();
            
            // Run search and filters
            applyFilters();
        } else {
            throw new Error(data.message || 'Unknown server error');
        }
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        
        if (state.releases.length === 0) {
            // Main feed error state
            DOM.errorState.classList.remove('hidden');
            DOM.errorMessage.textContent = error.message;
            DOM.loadingState.classList.add('hidden');
        } else {
            // Toast notification (simple alert)
            alert(`Failed to refresh feed: ${error.message}`);
        }
    } finally {
        DOM.refreshSpinner.classList.remove('spinning');
        DOM.refreshBtn.disabled = false;
        DOM.loadingState.classList.add('hidden');
    }
}

function renderFeed() {
    DOM.feedContainer.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        DOM.emptyState.classList.remove('hidden');
        DOM.feedContainer.classList.add('hidden');
        DOM.resultsCount.textContent = '0 items';
        return;
    }
    
    DOM.emptyState.classList.add('hidden');
    DOM.feedContainer.classList.remove('hidden');
    DOM.resultsCount.textContent = `${state.filteredReleases.length} item${state.filteredReleases.length !== 1 ? 's' : ''}`;
    
    state.filteredReleases.forEach(item => {
        const card = document.createElement('div');
        card.className = `release-card ${state.selectedId === item.id ? 'selected' : ''}`;
        card.id = `card-${item.id}`;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        
        const badgeClass = getBadgeClass(item.inferredType);
        const dateStr = formatDate(item.date);
        const plainTextPreview = stripHtml(item.content);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="card-date">${dateStr}</span>
                    <span class="badge ${badgeClass}">${item.inferredType}</span>
                </div>
                <button class="card-tweet-btn" data-id="${item.id}" title="Compose Tweet for this update" aria-label="Tweet about this update">
                    <i class="fa-brands fa-x-twitter"></i>
                </button>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p class="card-preview">${escapeHtml(plainTextPreview)}</p>
        `;
        
        // Click to select
        card.addEventListener('click', (e) => {
            // If they clicked the tweet button, handle that separately
            if (e.target.closest('.card-tweet-btn')) {
                const itemId = e.target.closest('.card-tweet-btn').dataset.id;
                selectRelease(itemId);
                focusTweetComposer();
                return;
            }
            selectRelease(item.id);
        });
        
        // Keyboard accessibility
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectRelease(item.id);
            }
        });
        
        DOM.feedContainer.appendChild(card);
    });
}

function applyFilters() {
    state.filteredReleases = state.releases.filter(item => {
        // Search Filter
        const plainText = stripHtml(item.content).toLowerCase();
        const titleText = item.title.toLowerCase();
        const matchesSearch = titleText.includes(state.searchQuery) || plainText.includes(state.searchQuery);
        
        // Type Filter
        const matchesType = state.typeFilter === 'all' || item.inferredType === state.typeFilter;
        
        return matchesSearch && matchesType;
    });
    
    renderFeed();
    
    // Auto-select first item if panel is empty and list is not empty
    if (state.filteredReleases.length > 0 && !state.selectedId) {
        selectRelease(state.filteredReleases[0].id);
    } else if (state.filteredReleases.length === 0) {
        clearSelection();
    } else {
        // Confirm selected item is still in filtered list
        const exists = state.filteredReleases.some(item => item.id === state.selectedId);
        if (!exists) {
            selectRelease(state.filteredReleases[0].id);
        }
    }
}

// ==========================================================================
// Selection & Tweet Composer
// ==========================================================================

function selectRelease(id) {
    state.selectedId = id;
    
    // Update active class in feed cards
    document.querySelectorAll('.release-card').forEach(card => {
        card.classList.remove('selected');
    });
    const activeCard = document.getElementById(`card-${id}`);
    if (activeCard) activeCard.classList.add('selected');
    
    const item = state.releases.find(r => r.id === id);
    if (!item) return;
    
    // Populate details panel
    DOM.detailsEmpty.classList.add('hidden');
    DOM.detailsContent.classList.remove('hidden');
    
    DOM.detailTitle.textContent = item.title;
    DOM.detailDate.textContent = formatDate(item.date);
    
    // Set badge style
    DOM.detailBadge.className = `badge ${getBadgeClass(item.inferredType)}`;
    DOM.detailBadge.textContent = item.inferredType;
    
    DOM.detailLink.href = item.link || "https://cloud.google.com/bigquery/docs/release-notes";
    DOM.detailBody.innerHTML = item.content;
    
    // Pre-populate tweet composer
    generateDefaultTweet(item);
}

function clearSelection() {
    state.selectedId = null;
    DOM.detailsEmpty.classList.remove('hidden');
    DOM.detailsContent.classList.add('hidden');
}

function generateDefaultTweet(item) {
    const hashtagText = " #BigQuery #GoogleCloud #DataEngineering";
    // We want the tweet to be: "BigQuery Update: [Title] \n\n[Link] #BigQuery #GoogleCloud"
    const prefix = "BigQuery Update: ";
    const link = item.link ? `\n\nRead more: ${item.link}` : "\n\nhttps://cloud.google.com/bigquery/docs/release-notes";
    
    // Limit title length to ensure total text fits X/Twitter character limits (280 characters)
    const availableLength = 280 - prefix.length - link.length - hashtagText.length;
    let title = item.title;
    if (title.length > availableLength) {
        title = title.substring(0, availableLength - 3) + "...";
    }
    
    const tweetText = `${prefix}${title}${link}${hashtagText}`;
    DOM.tweetTextarea.value = tweetText;
    updateCharCounter();
}

function updateCharCounter() {
    const count = DOM.tweetTextarea.value.length;
    DOM.charCounter.textContent = `${count} / 280`;
    
    DOM.charCounter.classList.remove('warning', 'danger');
    if (count > 280) {
        DOM.charCounter.classList.add('danger');
        DOM.tweetBtn.disabled = true;
    } else if (count > 250) {
        DOM.charCounter.classList.add('warning');
        DOM.tweetBtn.disabled = false;
    } else {
        DOM.tweetBtn.disabled = false;
    }
}

function focusTweetComposer() {
    DOM.tweetTextarea.focus();
    DOM.tweetTextarea.select();
}

// ==========================================================================
// Event Listeners & Time management
// ==========================================================================

function updateLastUpdatedTime() {
    if (!state.lastUpdated) {
        DOM.lastUpdatedText.textContent = 'Last checked: Never';
        return;
    }
    
    const minutes = Math.floor((new Date() - state.lastUpdated) / 60000);
    if (minutes === 0) {
        DOM.lastUpdatedText.textContent = 'Last checked: Just now';
    } else {
        DOM.lastUpdatedText.textContent = `Last checked: ${minutes} min ago`;
    }
}

// Export the filtered release notes to a CSV file
function exportToCSV() {
    if (state.filteredReleases.length === 0) {
        alert('No release notes to export.');
        return;
    }
    
    const headers = ['Title', 'Date', 'Type', 'Link', 'Content'];
    const rows = state.filteredReleases.map(item => {
        const title = item.title;
        const date = formatDate(item.date);
        const type = item.inferredType;
        const link = item.link || '';
        const content = stripHtml(item.content).replace(/\s+/g, ' ').trim();
        return [title, date, type, link, content];
    });
    
    let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
    rows.forEach(row => {
        const rowStr = row.map(val => `"${val.replace(/"/g, '""')}"`).join(',');
        csvContent += rowStr + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `bigquery_release_notes_${dateStamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Set up UI Event listeners
function setupEventListeners() {
    DOM.refreshBtn.addEventListener('click', fetchReleaseNotes);
    DOM.exportCsvBtn.addEventListener('click', exportToCSV);
    DOM.retryBtn.addEventListener('click', fetchReleaseNotes);
    
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
    });
    
    DOM.typeFilter.addEventListener('change', (e) => {
        state.typeFilter = e.target.value;
        applyFilters();
    });
    
    DOM.tweetTextarea.addEventListener('input', updateCharCounter);
    
    DOM.copyBtn.addEventListener('click', () => {
        const text = DOM.tweetTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = DOM.copyBtn.innerHTML;
            DOM.copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
            DOM.copyBtn.disabled = true;
            setTimeout(() => {
                DOM.copyBtn.innerHTML = originalHTML;
                DOM.copyBtn.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard.');
        });
    });
    
    DOM.tweetBtn.addEventListener('click', () => {
        const text = DOM.tweetTextarea.value;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
    
    // Hashtag suggestion buttons click
    DOM.tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            const currentText = DOM.tweetTextarea.value;
            
            if (!currentText.includes(tag)) {
                // Check if last char is space, otherwise add space
                const separator = currentText.length === 0 || currentText.endsWith(' ') || currentText.endsWith('\n') ? '' : ' ';
                DOM.tweetTextarea.value = currentText + separator + tag;
                updateCharCounter();
            }
        });
    });
}

// Escapes raw text to prevent DOM injection
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Periodic check for last-updated timestamp
setInterval(updateLastUpdatedTime, 30000);

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleaseNotes();
});
