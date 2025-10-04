// Utility functions for the Regnum Forum Archive

// Format timestamp 
export function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return timestamp; // Return original if parsing fails
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return timestamp;
    }
}

// Get language flag emoji
export function getLanguageFlag(language) {
    const flags = {
        'Español': '🇪🇸',
        'English': '🇺🇸',
        'Português': '🇵🇹',
        'Deutsch': '🇩🇪',
        'Français': '🇫🇷',
        'Italiano': '🇮🇹'
    };
    return flags[language] || '🌐';
}

// Sanitize HTML content
export function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// Truncate text
export function truncateText(text, length = 100) {
    if (!text) return '';
    
    const plainText = text.replace(/<[^>]*>/g, ''); // Strip HTML tags
    if (plainText.length <= length) {
        return plainText;
    }
    return plainText.substr(0, length) + '...';
}

// Debounce function
export function debounce(func, wait) {
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

// Show loading state
export function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-2">Loading...</div>
        </div>
    `;
}

// Show error state
export function showError(containerId, message, retryCallback = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const retryButton = retryCallback ? 
        `<button class="btn btn-outline-primary mt-2" onclick="(${retryCallback})()">
            <i class="bi bi-arrow-clockwise"></i> Try Again
        </button>` : '';
    
    container.innerHTML = `
        <div class="error-state">
            <i class="bi bi-exclamation-triangle text-warning"></i>
            <h4>Oops! Something went wrong</h4>
            <p class="text-muted">${message}</p>
            ${retryButton}
        </div>
    `;
}

// Show empty state
export function showEmpty(containerId, message, icon = 'bi-inbox') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-state">
            <i class="bi ${icon} text-muted"></i>
            <h4 class="text-muted">No Content Found</h4>
            <p class="text-muted">${message}</p>
        </div>
    `;
}

// Show toast notification
export function showToast(message, type = 'success') {
    const toastId = type === 'success' ? 'success-toast' : 'error-toast';
    const messageId = type === 'success' ? 'success-message' : 'error-message';
    
    document.getElementById(messageId).textContent = message;
    
    const toast = new bootstrap.Toast(document.getElementById(toastId));
    toast.show();
}

// Format large numbers
export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

// Get URL parameters
export function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(params.entries());
}

// Update URL without page reload
export function updateUrl(path, params = {}) {
    const url = new URL(window.location);
    url.pathname = path;
    url.search = '';
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            url.searchParams.set(key, value);
        }
    });
    
    window.history.pushState({ path, params }, '', url);
}

// Scroll to top with smooth animation
export function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Highlight search terms in text
export function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Escape regex special characters
export function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Copy text to clipboard
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showToast('Failed to copy to clipboard', 'error');
        return false;
    }
}

// Generate unique ID
export function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

// Validate pagination parameters
export function validatePagination(page, limit = 20) {
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    
    return {
        page: validatedPage,
        limit: validatedLimit
    };
}

// Create loading placeholder HTML
export function createLoadingPlaceholder(count = 3, height = '60px') {
    return Array.from({ length: count }, () => 
        `<div class="loading-placeholder mb-3" style="height: ${height};"></div>`
    ).join('');
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown';
    
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
        return `${Math.floor(diffInSeconds / 31536000)} years ago`;
    } catch (error) {
        return timestamp;
    }
}

// Local storage helpers
export const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }
};

// Performance monitoring
export function measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`⏱️ ${name} took ${(end - start).toFixed(2)}ms`);
    return result;
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(callback, options = {}) {
    const defaultOptions = {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
    };
    
    return new IntersectionObserver(callback, { ...defaultOptions, ...options });
}

// Check if element is in viewport
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Smooth scroll to element
export function scrollToElement(element, offset = 0) {
    if (!element) return;
    
    const top = element.offsetTop - offset;
    window.scrollTo({
        top,
        behavior: 'smooth'
    });
}

// SEO Utility Functions

// Update page title dynamically
export function updatePageTitle(title, baseTitle = 'Regnum Online Forum Archive') {
    document.title = title ? `${title} - ${baseTitle}` : baseTitle;
}

// Update meta tag content
export function updateMetaTag(property, content) {
    let selector;
    if (property.startsWith('og:') || property.startsWith('twitter:')) {
        selector = `meta[property="${property}"], meta[name="${property}"]`;
    } else {
        selector = `meta[name="${property}"]`;
    }
    
    let meta = document.querySelector(selector);
    if (meta) {
        meta.setAttribute('content', content);
    } else {
        // Create meta tag if it doesn't exist
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', property);
        }
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    }
}

// Update canonical URL
export function updateCanonicalUrl(url) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        canonical.setAttribute('href', url);
    } else {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        canonical.setAttribute('href', url);
        document.head.appendChild(canonical);
    }
}

// Comprehensive SEO update for pages
export function updateSEO(options = {}) {
    const {
        title,
        description,
        url,
        keywords,
        image = '/assets/cor-logo.png',
        type = 'website'
    } = options;
    
    // Update page title
    if (title) {
        updatePageTitle(title);
    }
    
    // Update meta description
    if (description) {
        updateMetaTag('description', description);
        updateMetaTag('og:description', description);
        updateMetaTag('twitter:description', description);
    }
    
    // Update keywords
    if (keywords) {
        updateMetaTag('keywords', keywords);
    }
    
    // Update canonical URL
    if (url) {
        updateCanonicalUrl(url);
        updateMetaTag('og:url', url);
    }
    
    // Update Open Graph and Twitter Card data
    if (title) {
        updateMetaTag('og:title', title);
        updateMetaTag('twitter:title', title);
    }
    
    if (image) {
        updateMetaTag('og:image', image);
        updateMetaTag('twitter:image', image);
    }
    
    if (type) {
        updateMetaTag('og:type', type);
    }
}

// Generate structured data (JSON-LD) for search engines
export function generateStructuredData(type, data) {
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': type,
        ...data
    };
    
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
        existingScript.remove();
    }
    
    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
}

// Generate breadcrumb structured data
export function generateBreadcrumbStructuredData(breadcrumbs) {
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbs.map((breadcrumb, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': breadcrumb.text,
            'item': breadcrumb.url || window.location.href
        }))
    };
    
    generateStructuredData('BreadcrumbList', structuredData);
}

// Scroll Position Management

// Save current scroll position
export function saveScrollPosition(key = 'main') {
    const scrollY = window.scrollY || window.pageYOffset;
    storage.set(`scrollPos_${key}`, scrollY);
}

// Restore saved scroll position
export function restoreScrollPosition(key = 'main', delay = 100) {
    const savedPosition = storage.get(`scrollPos_${key}`);
    if (savedPosition !== null && savedPosition !== undefined) {
        setTimeout(() => {
            window.scrollTo({
                top: savedPosition,
                behavior: 'smooth'
            });
        }, delay);
        return true;
    }
    return false;
}

// Clear saved scroll position
export function clearScrollPosition(key = 'main') {
    storage.remove(`scrollPos_${key}`);
}

// Auto-save scroll position with throttling
let scrollSaveTimeout;
export function enableAutoScrollSave(key = 'main', throttleMs = 250) {
    const saveThrottled = () => {
        clearTimeout(scrollSaveTimeout);
        scrollSaveTimeout = setTimeout(() => {
            saveScrollPosition(key);
        }, throttleMs);
    };
    
    window.addEventListener('scroll', saveThrottled, { passive: true });
    
    // Return cleanup function
    return () => {
        window.removeEventListener('scroll', saveThrottled);
        clearTimeout(scrollSaveTimeout);
    };
}