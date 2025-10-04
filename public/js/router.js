// Client-side router for the Regnum Forum Archive
import { updateUrl, getUrlParams, scrollToTop } from './utils.js';
// WebSocket removed - static archive only

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.currentParams = {};
        
        // Initialize router
        this.setupEventHandlers();
    }
    
    // Setup event handlers
    setupEventHandlers() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });
        
        // Handle initial page load
        window.addEventListener('DOMContentLoaded', () => {
            this.handleInitialRoute();
        });
    }
    
    // Define a route
    route(path, handler, name = null) {
        this.routes.set(path, { handler, name });
        return this;
    }
    
    // Navigate to a route
    navigate(path, params = {}, updateHistory = true) {
        // Find matching route
        const routeInfo = this.findRouteWithParams(path);
        
        if (!routeInfo) {
            console.error('Route not found:', path);
            this.navigate('/'); // Fallback to home
            return;
        }
        
        // Merge URL params with extracted route params
        const mergedParams = { ...routeInfo.params, ...params };
        
        // Update URL if requested
        if (updateHistory) {
            updateUrl(path, params);
        }
        
        // Store current state
        this.currentRoute = path;
        this.currentParams = mergedParams;
        
        // Notify WebSocket of page change
        // WebSocket navigation removed - static archive
        
        // Execute route handler
        try {
            console.log('🔧 Executing route handler for:', path, 'with params:', mergedParams);
            routeInfo.route.handler(mergedParams);
        } catch (error) {
            console.error('Error executing route handler:', error);
            this.showError('Failed to load page');
        }
        
        // Scroll to top
        scrollToTop();
    }
    
    // Find route by path
    findRoute(path) {
        // Try exact match first
        if (this.routes.has(path)) {
            return this.routes.get(path);
        }
        
        // Try pattern matching for dynamic routes
        for (const [routePath, route] of this.routes.entries()) {
            if (this.matchRoute(routePath, path)) {
                return route;
            }
        }
        
        return null;
    }
    
    // Find route by path and extract parameters
    findRouteWithParams(path) {
        // Try exact match first
        if (this.routes.has(path)) {
            return { 
                route: this.routes.get(path), 
                params: {} 
            };
        }
        
        // Try pattern matching for dynamic routes
        for (const [routePath, route] of this.routes.entries()) {
            if (this.matchRoute(routePath, path)) {
                const params = this.extractParams(routePath, path);
                return { 
                    route, 
                    params 
                };
            }
        }
        
        return null;
    }
    
    // Match route with parameters
    matchRoute(routePath, actualPath) {
        // Convert route pattern to regex
        const routeRegex = routePath.replace(/:\w+/g, '([^/]+)');
        const regex = new RegExp(`^${routeRegex}$`);
        
        return regex.test(actualPath);
    }
    
    // Extract parameters from path
    extractParams(routePath, actualPath) {
        const routeParts = routePath.split('/');
        const actualParts = actualPath.split('/');
        const params = {};
        
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const actualPart = actualParts[i];
            
            if (routePart.startsWith(':')) {
                const paramName = routePart.substring(1);
                params[paramName] = actualPart;
            }
        }
        
        return params;
    }
    
    // Handle browser back/forward
    handlePopState(event) {
        const path = window.location.pathname;
        const params = getUrlParams();
        
        this.navigate(path, params, false);
    }
    
    // Handle initial page load
    handleInitialRoute() {
        const path = window.location.pathname;
        const params = getUrlParams();
        
        // Default to home if no path
        if (path === '/' || path === '') {
            this.navigate('/', params, false);
        } else {
            this.navigate(path, params, false);
        }
    }
    
    // Show error page
    showError(message) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="error-state">
                    <i class="bi bi-exclamation-triangle display-1 text-warning mb-3"></i>
                    <h2>Oops! Something went wrong</h2>
                    <p class="text-muted">${message}</p>
                    <button class="btn btn-primary" onclick="router.navigate('/')">
                        <i class="bi bi-house"></i> Go Home
                    </button>
                </div>
            `;
        }
    }
    
    // Get current route info
    getCurrentRoute() {
        return {
            path: this.currentRoute,
            params: this.currentParams
        };
    }
    
    // Check if current route matches pattern
    isCurrentRoute(pattern) {
        if (!this.currentRoute) return false;
        
        if (typeof pattern === 'string') {
            return this.currentRoute === pattern;
        }
        
        if (pattern instanceof RegExp) {
            return pattern.test(this.currentRoute);
        }
        
        return false;
    }
}

// Create singleton instance
const router = new Router();

// Function to setup routes once the app is available
export function setupRoutes(forumApp) {
    router
        .route('/', (params) => {
            forumApp.loadHomePage(params);
        }, 'home')
        .route('/users', (params) => {
            forumApp.loadUsersPage(params);
        }, 'users')
        .route('/users/:id', (params) => {
            const userId = parseInt(params.id);
            forumApp.loadUserProfilePage(userId, params);
        }, 'user-profile')
        .route('/threads/:id', (params) => {
            const threadId = parseInt(params.id);
            forumApp.loadThreadPage(threadId, params);
        }, 'thread-view')
        .route('/stats', (params) => {
            forumApp.loadStatsPage(params);
        }, 'stats')
        .route('/search', (params) => {
            forumApp.loadSearchPage(params);
        }, 'search');
}

// Function to setup global navigation functions
export function setupNavigationFunctions() {
    // Navigation helper functions for global use
    window.navigateToHome = (params = {}) => {
        router.navigate('/', params);
    };

    window.navigateToUsers = (params = {}) => {
        router.navigate('/users', params);
    };

    window.navigateToUser = (userId, params = {}) => {
        router.navigate(`/users/${userId}`, params);
    };

    window.navigateToThread = (threadId, params = {}) => {
        router.navigate(`/threads/${threadId}`, params);
    };

    window.navigateToStats = (params = {}) => {
        router.navigate('/stats', params);
    };

    window.filterByLanguage = (language, params = {}) => {
        router.navigate('/', { ...params, language });
    };

    window.filterByCategory = (language, category, params = {}) => {
        router.navigate('/', { ...params, language, category });
    };

    console.log('✅ Global navigation functions setup complete');
}

window.navigateToSearch = (params = {}) => {
    router.navigate('/search', params);
};

// Pagination navigation
window.navigateToPage = (page) => {
    const currentRoute = router.getCurrentRoute();
    const newParams = { ...currentRoute.params, page };
    router.navigate(currentRoute.path, newParams);
};

// Filter functions
window.filterByLanguage = (language) => {
    const params = { language };
    if (language) {
        delete params.category; // Clear category when changing language
    }
    router.navigate('/', params);
};

window.filterByCategory = (language, category) => {
    const params = { language, category };
    router.navigate('/', params);
};

window.clearCategoryFilter = () => {
    const currentRoute = router.getCurrentRoute();
    const params = { ...currentRoute.params };
    delete params.category;
    router.navigate(currentRoute.path, params);
};

window.getCurrentLanguage = () => {
    const currentRoute = router.getCurrentRoute();
    return currentRoute.params.language || null;
};

// Search function
window.performSearch = () => {
    const searchInput = document.getElementById('search-input');
    const languageSelect = document.getElementById('language-select');
    const categorySelect = document.getElementById('category-select');
    
    const query = searchInput?.value?.trim();
    const language = languageSelect?.value || null;
    const category = categorySelect?.value || null;
    
    if (!query) {
        // If no search query, navigate to home with filters
        const params = {};
        if (language) params.language = language;
        if (category) params.category = category;
        router.navigate('/', params);
        return;
    }
    
    // Navigate to search page
    const params = { search: query };
    if (language) params.language = language;
    if (category) params.category = category;
    
    router.navigate('/search', params);
    
    // Notify WebSocket of search
    // WebSocket search tracking removed - static archive
};

// Handle search input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});

// Copy post link function
window.copyPostLink = (postId) => {
    const url = `${window.location.origin}${window.location.pathname}#${postId}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            window.forumApp.showToast('Post link copied to clipboard!');
        }).catch(() => {
            fallbackCopyToClipboard(url);
        });
    } else {
        fallbackCopyToClipboard(url);
    }
};

// Fallback copy function
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        window.forumApp.showToast('Post link copied to clipboard!');
    } catch (err) {
        console.error('Fallback copy failed:', err);
        window.forumApp.showToast('Failed to copy link', 'error');
    }
    
    document.body.removeChild(textArea);
}

export default router;