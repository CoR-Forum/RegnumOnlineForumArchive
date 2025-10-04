// API client for the Regnum Forum Archive
import { showToast } from './utils.js';

class ApiClient {
    constructor() {
        this.baseUrl = '/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Add default response interceptor for error handling
        this.responseInterceptors.push(this.handleApiError.bind(this));
    }
    
    // Add request interceptor
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    
    // Add response interceptor
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
    
    // Handle API errors
    handleApiError(response) {
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.response = response;
            throw error;
        }
        return response;
    }
    
    // Make HTTP request
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders },
            ...options
        };
        
        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            await interceptor(config);
        }
        
        try {
            let response = await fetch(url, config);
            
            // Apply response interceptors
            for (const interceptor of this.responseInterceptors) {
                response = await interceptor(response);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('API request failed:', error);
            
            // Show user-friendly error message
            if (error.status === 404) {
                showToast('Content not found', 'error');
            } else if (error.status >= 500) {
                showToast('Server error. Please try again later.', 'error');
            } else if (!navigator.onLine) {
                showToast('No internet connection', 'error');
            } else {
                showToast('Something went wrong. Please try again.', 'error');
            }
            
            throw error;
        }
    }
    
    // GET request
    async get(endpoint, params = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                searchParams.append(key, value);
            }
        });
        
        const queryString = searchParams.toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, { method: 'GET' });
    }
    
    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Create singleton instance
const api = new ApiClient();

// Threads API
export const threadsAPI = {
    // Get threads with filtering and pagination
    async getThreads(filters = {}) {
        const { language, category, search, page = 1, limit = 20 } = filters;
        return api.get('/threads', { language, category, search, page, limit });
    },
    
    // Get specific thread
    async getThread(threadId) {
        return api.get(`/threads/${threadId}`);
    },
    
    // Get posts for a thread
    async getThreadPosts(threadId, page = 1, limit = 20) {
        return api.get(`/threads/${threadId}/posts`, { page, limit });
    },
    
    // Get available languages
    async getLanguages() {
        return api.get('/threads/meta/languages');
    },
    
    // Get categories (optionally filtered by language)
    async getCategories(language = null) {
        return api.get('/threads/meta/categories', { language });
    }
};

// Users API
export const usersAPI = {
    // Get users with pagination and search
    async getUsers(filters = {}) {
        const { search, page = 1, limit = 50 } = filters;
        return api.get('/users', { search, page, limit });
    },
    
    // Get specific user
    async getUser(userId) {
        return api.get(`/users/${userId}`);
    },
    
    // Get user posts
    async getUserPosts(userId, page = 1, limit = 20) {
        return api.get(`/users/${userId}/posts`, { page, limit });
    },
    
    // Get user threads
    async getUserThreads(userId, page = 1, limit = 20) {
        return api.get(`/users/${userId}/threads`, { page, limit });
    }
};

// Statistics API
export const statsAPI = {
    // Get comprehensive statistics
    async getStats() {
        return api.get('/stats');
    },
    
    // Get overview statistics
    async getOverview() {
        return api.get('/stats/overview');
    },
    
    // Get language statistics
    async getLanguageStats() {
        return api.get('/stats/languages');
    },
    
    // Get user statistics
    async getUserStats(limit = 20) {
        return api.get('/stats/users', { limit });
    },
    
    // Get activity statistics
    async getActivityStats() {
        return api.get('/stats/activity');
    },
    
    // Get category statistics
    async getCategoryStats(limit = 10) {
        return api.get('/stats/categories', { limit });
    }
};

// Health check
export const healthAPI = {
    async check() {
        return api.get('/health');
    }
};

// Cache implementation for frequently accessed data
class ApiCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 5 * 60 * 1000; // 5 minutes TTL
    }
    
    // Generate cache key
    generateKey(endpoint, params = {}) {
        const paramString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        return `${endpoint}?${paramString}`;
    }
    
    // Get from cache
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    // Set cache
    set(key, data, customTtl = null) {
        const expiry = Date.now() + (customTtl || this.ttl);
        this.cache.set(key, { data, expiry });
    }
    
    // Clear cache
    clear() {
        this.cache.clear();
    }
    
    // Clear expired items
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Create cache instance
const cache = new ApiCache();

// Cleanup cache every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

// Cached API wrapper
export const cachedAPI = {
    async get(apiFunction, ...args) {
        const key = `${apiFunction.name}_${JSON.stringify(args)}`;
        
        // Try to get from cache first
        let data = cache.get(key);
        if (data) {
            return data;
        }
        
        // Fetch from API and cache result
        data = await apiFunction(...args);
        cache.set(key, data);
        
        return data;
    },
    
    // Clear specific cache entries
    clearCache(pattern = null) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const key of cache.cache.keys()) {
                if (regex.test(key)) {
                    cache.cache.delete(key);
                }
            }
        } else {
            cache.clear();
        }
    }
};

// Request queue for handling concurrent requests
class RequestQueue {
    constructor() {
        this.queue = new Map(); // endpoint -> promise
    }
    
    // Add request to queue or return existing promise
    async add(key, requestFn) {
        if (this.queue.has(key)) {
            return this.queue.get(key);
        }
        
        const promise = requestFn().finally(() => {
            this.queue.delete(key);
        });
        
        this.queue.set(key, promise);
        return promise;
    }
}

const requestQueue = new RequestQueue();

// Deduplicated API wrapper
export const dededupedAPI = {
    async request(apiFunction, ...args) {
        const key = `${apiFunction.name}_${JSON.stringify(args)}`;
        
        return requestQueue.add(key, () => apiFunction(...args));
    }
};

// Export default API client for direct use
export default api;