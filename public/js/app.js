// Main application entry point for the Regnum Forum Archive
import { 
    showLoading, 
    showError, 
    showEmpty, 
    showToast, 
    debounce,
    validatePagination,
    storage,
    updateSEO,
    generateStructuredData,
    generateBreadcrumbStructuredData,
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
    enableAutoScrollSave
} from './utils.js';
import { threadsAPI, usersAPI, statsAPI, cachedAPI } from './api.js';
// WebSocket removed - static archive only
import {
    createThreadList,
    createPostsList,
    createUserList,
    createLanguageTabs,
    createCategoriesOverview,
    createCategoriesSidebar,
    createPagination,
    createBreadcrumb,
    createStatsCards,
    createSearchInfo,
    createThreadHeader,
    createPageHeader
} from './components.js';
import router, { setupRoutes, setupNavigationFunctions } from './router.js';

class ForumApplication {
    constructor() {
        this.currentFilters = {
            language: null,
            category: null,
            search: null,
            page: 1
        };
        
        this.cachedData = {
            languages: null,
            categories: {},
            stats: null
        };
        
        this.searchDebounced = debounce(this.handleSearchInput.bind(this), 300);
        
        // Enable auto-scroll position saving
        this.scrollCleanup = enableAutoScrollSave('homepage', 200);
        
        // Initialize application
        this.init();
    }
    
    // Initialize the application
    async init() {
        console.log('🚀 Initializing Regnum Forum Archive...');
        
        try {
            console.log('🔧 Setting up routes and navigation functions...');
            // Setup routes and navigation functions now that app is available
            setupRoutes(this);
            setupNavigationFunctions();
            console.log('✅ Routes and navigation setup complete');
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Hide loading overlay
            this.hideLoadingOverlay();
            
            console.log('✅ Forum Archive initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('main-content', 'Failed to load the forum. Please refresh the page.');
            this.hideLoadingOverlay();
        }
    }
    
    // Load initial data
    async loadInitialData() {
        try {
            // Load languages for dropdown
            const languagesResponse = await cachedAPI.get(threadsAPI.getLanguages);
            if (languagesResponse.success) {
                this.cachedData.languages = languagesResponse.data;
                this.populateLanguageSelect(languagesResponse.data);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }
    
    // Setup event handlers
    setupEventHandlers() {
        // Search input handler
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.searchDebounced);
        }
        
        // Language select handler
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', this.handleLanguageChange.bind(this));
        }
        
        // Category select handler
        const categorySelect = document.getElementById('category-select');
        if (categorySelect) {
            categorySelect.addEventListener('change', this.handleCategoryChange.bind(this));
        }
        
        // WebSocket event handlers
        // WebSocket event listeners removed - static archive only
    }
    
    // Hide loading overlay
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }
    
    // Show toast notification
    showToast(message, type = 'success') {
        showToast(message, type);
    }
    
    // Populate language select
    populateLanguageSelect(languages) {
        const languageSelect = document.getElementById('language-select');
        if (!languageSelect) return;
        
        // Clear existing options except "All Languages"
        const allOption = languageSelect.children[0];
        languageSelect.innerHTML = '';
        languageSelect.appendChild(allOption);
        
        // Add language options
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.language;
            option.textContent = `${this.getLanguageFlag(lang.language)} ${lang.language}`;
            languageSelect.appendChild(option);
        });
    }
    
    // Populate category select
    async populateCategories(language) {
        const categorySelect = document.getElementById('category-select');
        if (!categorySelect) return;
        
        // Clear existing options
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        
        if (!language) {
            categorySelect.disabled = true;
            return;
        }
        
        try {
            // Check cache first
            if (this.cachedData.categories[language]) {
                this.fillCategorySelect(this.cachedData.categories[language]);
                return;
            }
            
            // Load categories from API
            const response = await threadsAPI.getCategories(language);
            if (response.success) {
                this.cachedData.categories[language] = response.data;
                this.fillCategorySelect(response.data);
            }
            
        } catch (error) {
            console.error('Failed to load categories:', error);
            categorySelect.disabled = true;
        }
    }
    
    // Fill category select with options
    fillCategorySelect(categories) {
        const categorySelect = document.getElementById('category-select');
        if (!categorySelect) return;
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.category;
            option.textContent = cat.category;
            categorySelect.appendChild(option);
        });
        
        categorySelect.disabled = false;
    }
    
    // Handle search input
    handleSearchInput(event) {
        const query = event.target.value.trim();
        
        // Show search suggestions (could be implemented)
        // this.showSearchSuggestions(query);
    }
    
    // Handle language change
    async handleLanguageChange(event) {
        const language = event.target.value || null;
        await this.populateCategories(language);
        
        // Clear category selection when language changes
        const categorySelect = document.getElementById('category-select');
        if (categorySelect) {
            categorySelect.value = '';
        }
    }
    
    // Handle category change
    handleCategoryChange(event) {
        // Category change is handled by the form submission
    }
    
    // Load home page
    async loadHomePage(params = {}) {
        const { language, category, page = 1 } = params;
        
        // Save current scroll position if we're changing filters but not pagination
        const currentFilters = this.currentFilters;
        const isPageNavigation = currentFilters.language === language && 
                               currentFilters.category === category && 
                               currentFilters.page !== page;
        const shouldPreserveScroll = currentFilters.language === language && 
                                   currentFilters.category !== category;
        
        // Update UI state
        this.updateFilters(params);
        this.updateBreadcrumb([
            { text: 'Forum', icon: 'bi-house', action: 'navigateToHome()' }
        ]);
        
        // Update SEO for home page
        let seoTitle = 'Regnum Online Forum Archive';
        let seoDescription = 'Champions of Regnum community forum archive. Browse threads, posts, and discussions from the Regnum Online gaming community.';
        let seoUrl = '/';
        
        if (language) {
            seoTitle = `${language} Threads - Regnum Online Forum Archive`;
            seoDescription = `Browse ${language} discussions and threads from the Champions of Regnum community.`;
            seoUrl = `/?language=${encodeURIComponent(language)}`;
        }
        
        if (category) {
            seoTitle = `${category} (${language}) - Regnum Online Forum Archive`;
            seoDescription = `Browse ${category} discussions in ${language} from the Champions of Regnum community.`;
            seoUrl = `/?language=${encodeURIComponent(language)}&category=${encodeURIComponent(category)}`;
        }
        
        updateSEO({
            title: seoTitle,
            description: seoDescription,
            url: seoUrl,
            keywords: `Regnum Online, Champions of Regnum, forum archive, ${language || 'gaming'}, ${category || 'discussions'}, threads, posts`
        });
        
        try {
            showLoading('main-content');
            
            // Load threads
            const threadsResponse = await threadsAPI.getThreads({
                language,
                category,
                page,
                limit: 20
            });
            
            if (!threadsResponse.success) {
                throw new Error('Failed to load threads');
            }
            
            const { threads, pagination } = threadsResponse.data;
            
            // Build page content
            let content = '';
            
            // Add language tabs if we have languages
            if (this.cachedData.languages) {
                content += createLanguageTabs(this.cachedData.languages, language);
            }
            
            // Add categories overview if no specific language is selected
            if (!language && !category) {
                try {
                    const categoriesResponse = await threadsAPI.getCategories();
                    if (categoriesResponse.success) {
                        content += createCategoriesOverview(categoriesResponse.data);
                    }
                } catch (error) {
                    console.warn('Failed to load categories overview:', error);
                }
            }
            
            // Create main content area
            content += '<div class="row">';
            
            // Add categories sidebar if language is selected
            if (language) {
                try {
                    const categoriesResponse = await threadsAPI.getCategories(language);
                    if (categoriesResponse.success) {
                        content += createCategoriesSidebar(categoriesResponse.data, category);
                    }
                } catch (error) {
                    console.warn('Failed to load categories sidebar:', error);
                }
            }
            
            // Add threads list
            const mainColClass = language ? 'col-md-9' : 'col-12';
            content += `<div class="${mainColClass}">`;
            content += createThreadList(threads);
            content += '</div>';
            
            content += '</div>';
            
            // Update main content
            document.getElementById('main-content').innerHTML = content;
            
            // Update pagination
            this.updatePagination(pagination);
            
            // Handle scroll position
            if (shouldPreserveScroll && !isPageNavigation) {
                // For category changes within same language, restore scroll position
                restoreScrollPosition('homepage', 150);
            } else if (isPageNavigation) {
                // For pagination, scroll to top of content
                setTimeout(() => {
                    const mainContent = document.getElementById('main-content');
                    if (mainContent) {
                        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            } else {
                // For new language/category selection, clear saved position and scroll to top
                clearScrollPosition('homepage');
            }
            
        } catch (error) {
            console.error('Failed to load home page:', error);
            showError('main-content', 'Failed to load forum threads. Please try again.');
        }
    }
    
    // Load thread page
    async loadThreadPage(threadId, params = {}) {
        const { page = 1 } = params;
        
        try {
            showLoading('main-content');
            
            // Load thread details and posts
            const [threadResponse, postsResponse] = await Promise.all([
                threadsAPI.getThread(threadId),
                threadsAPI.getThreadPosts(threadId, page, 20)
            ]);
            
            if (!threadResponse.success || !postsResponse.success) {
                throw new Error('Failed to load thread');
            }
            
            const thread = threadResponse.data;
            const { posts, pagination } = postsResponse.data;
            
            // Update breadcrumb
            const breadcrumbs = [
                { text: 'Forum', icon: 'bi-house', action: 'navigateToHome()', url: '/' },
                { text: thread.language, action: `filterByLanguage('${thread.language}')`, url: `/?language=${encodeURIComponent(thread.language)}` },
                { text: thread.category, action: `filterByCategory('${thread.language}', '${thread.category}')`, url: `/?language=${encodeURIComponent(thread.language)}&category=${encodeURIComponent(thread.category)}` },
                { text: thread.name, url: `/threads/${threadId}` }
            ];
            this.updateBreadcrumb(breadcrumbs);
            
            // Update SEO for thread page
            const threadDescription = posts && posts.length > 0 && posts[0].content ? 
                posts[0].content.replace(/<[^>]*>/g, '').substring(0, 160) + '...' :
                `Discussion thread about ${thread.name} in the Champions of Regnum community.`;
                
            updateSEO({
                title: thread.name,
                description: threadDescription,
                url: `/threads/${threadId}`,
                keywords: `${thread.name}, ${thread.language}, ${thread.category}, Regnum Online, Champions of Regnum, forum, discussion`,
                type: 'article'
            });
            
            // Generate structured data for the thread
            generateStructuredData('Article', {
                headline: thread.name,
                description: threadDescription,
                author: {
                    '@type': 'Person',
                    name: thread.threadCreator || 'Unknown'
                },
                publisher: {
                    '@type': 'Organization',
                    name: 'Regnum Online Forum Archive'
                },
                datePublished: thread.createdTime,
                dateModified: thread.lastPostTime || thread.createdTime,
                articleSection: thread.category,
                inLanguage: thread.language
            });
            
            // Generate breadcrumb structured data
            generateBreadcrumbStructuredData(breadcrumbs);
            
            // Build content
            let content = createThreadHeader(thread);
            
            // Add pagination if multiple pages
            if (pagination.totalPages > 1) {
                content += `<div class="mb-4">${createPagination(pagination)}</div>`;
            }
            
            // Add posts
            content += createPostsList(posts, thread);
            
            // Add bottom pagination
            if (pagination.totalPages > 1) {
                content += `<div class="mt-4">${createPagination(pagination)}</div>`;
            }
            
            // Add back navigation
            content += `
                <div class="text-center mt-4 mb-4">
                    <button onclick="filterByCategory('${thread.language}', '${thread.category}')" class="btn btn-outline-primary">
                        <i class="bi bi-arrow-left"></i> Back to ${thread.category}
                    </button>
                    <button onclick="navigateToHome()" class="btn btn-outline-secondary ms-2">
                        <i class="bi bi-house"></i> Forum Home
                    </button>
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = content;
            this.updatePagination(pagination);
            
            // Notify WebSocket that we're viewing this thread
            // WebSocket thread viewing removed - static archive
            
        } catch (error) {
            console.error('Failed to load thread:', error);
            showError('main-content', 'Failed to load thread. Please try again.');
        }
    }
    
    // Load users page
    async loadUsersPage(params = {}) {
        const { search, page = 1 } = params;
        
        const breadcrumbs = [
            { text: 'Forum', icon: 'bi-house', action: 'navigateToHome()', url: '/' },
            { text: 'Users', url: '/users' }
        ];
        this.updateBreadcrumb(breadcrumbs);
        
        // Update SEO for users page
        const usersTitle = search ? `Search: "${search}" - Users` : 'Community Members';
        const usersDescription = search ? 
            `Search results for "${search}" among Champions of Regnum community members.` :
            'Browse the Champions of Regnum community members and their forum participation.';
            
        updateSEO({
            title: usersTitle,
            description: usersDescription,
            url: search ? `/users?search=${encodeURIComponent(search)}` : '/users',
            keywords: `${search || 'users'}, members, community, Regnum Online, Champions of Regnum, forum archive`
        });
        
        // Generate breadcrumb structured data
        generateBreadcrumbStructuredData(breadcrumbs);
        
        try {
            showLoading('main-content');
            
            const response = await usersAPI.getUsers({ search, page, limit: 50 });
            
            if (!response.success) {
                throw new Error('Failed to load users');
            }
            
            const { users, pagination } = response.data;
            
            let content = '';
            
            // Add consistent page header
            content += createPageHeader('Users', 'Community Members', 'bi-people-fill');
            
            // Add container wrapper
            content += '<div class="container">';
            
            // Add search info if searching
            if (search) {
                content += createSearchInfo(search, null, users.length);
            }
            
            // Add results info
            content += `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="mb-0">
                        <i class="bi bi-people-fill"></i> 
                        ${search ? 'Search Results' : 'All Users'}
                        <span class="badge bg-primary ms-2">${pagination.totalUsers}</span>
                    </h5>
                    <div class="text-muted">
                        Showing ${pagination.startItem}-${pagination.endItem} of ${pagination.totalUsers}
                    </div>
                </div>
            `;
            
            content += createUserList(users, search);
            
            // Close container wrapper
            content += '</div>';
            
            document.getElementById('main-content').innerHTML = content;
            this.updatePagination(pagination);
            
        } catch (error) {
            console.error('Failed to load users:', error);
            showError('main-content', 'Failed to load users. Please try again.');
        }
    }
    
    // Load user profile page
    async loadUserProfilePage(userId, params = {}) {
        try {
            showLoading('main-content');
            
            const response = await usersAPI.getUser(userId);
            
            if (!response.success) {
                throw new Error('User not found');
            }
            
            const user = response.data;
            
            this.updateBreadcrumb([
                { text: 'Forum', icon: 'bi-house', action: 'navigateToHome()' },
                { text: 'Users', action: 'navigateToUsers()' },
                { text: user.name }
            ]);
            
            // User profile content would go here
            // This is a simplified version
            const content = `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="bi bi-person-circle"></i> ${user.name}</h3>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="text-center mb-3">
                                    <div class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                                        <i class="bi bi-person-fill fs-2"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-9">
                                <div class="row mb-3">
                                    <div class="col-sm-6">
                                        <div class="card text-center">
                                            <div class="card-body">
                                                <h4 class="text-primary">${user.postCount || 0}</h4>
                                                <p class="text-muted mb-0">Posts</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="card text-center">
                                            <div class="card-body">
                                                <h4 class="text-success">${user.threadCount || 0}</h4>
                                                <p class="text-muted mb-0">Threads</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                ${user.firstPost ? `<p><i class="bi bi-calendar-plus"></i> Joined: ${user.firstPost}</p>` : ''}
                                ${user.lastPost ? `<p><i class="bi bi-clock"></i> Last seen: ${user.lastPost}</p>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <button onclick="navigateToUsers()" class="btn btn-outline-primary">
                        <i class="bi bi-arrow-left"></i> Back to Users
                    </button>
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = content;
            
        } catch (error) {
            console.error('Failed to load user profile:', error);
            showError('main-content', 'Failed to load user profile. Please try again.');
        }
    }
    
    // Load statistics page
    async loadStatsPage(params = {}) {
        const breadcrumbs = [
            { text: 'Forum', icon: 'bi-house', action: 'navigateToHome()', url: '/' },
            { text: 'Statistics', url: '/stats' }
        ];
        this.updateBreadcrumb(breadcrumbs);
        
        // Update SEO for statistics page
        updateSEO({
            title: 'Forum Statistics',
            description: 'Champions of Regnum forum archive statistics including post counts, active users, languages, and community analytics.',
            url: '/stats',
            keywords: 'statistics, analytics, forum stats, Regnum Online, Champions of Regnum, community data, post counts, users'
        });
        
        // Generate breadcrumb structured data
        generateBreadcrumbStructuredData(breadcrumbs);
        
        try {
            showLoading('main-content');
            
            const response = await statsAPI.getStats();
            
            if (!response.success) {
                throw new Error('Failed to load statistics');
            }
            
            const stats = response.data;
            
            // Ensure stats has required structure
            if (!stats) {
                throw new Error('No statistics data available');
            }
            
            // Provide defaults for missing data
            stats.languages = stats.languages || [];
            stats.mostActiveUsers = stats.mostActiveUsers || [];
            
            let content = '';
            
            // Add consistent page header
            content += createPageHeader('Statistics', 'Forum Archive Analytics', 'bi-bar-chart-fill');
            
            // Add container wrapper
            content += '<div class="container">';
            
            content += createStatsCards(stats);
            
            // Add detailed statistics sections
            content += `
                <div class="row">
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="bi bi-translate"></i> Languages</h5>
                            </div>
                            <div class="card-body">
                                ${stats.languages && stats.languages.length > 0 ? stats.languages.map(lang => `
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <strong>${lang.flag || '🌐'} ${lang.language || 'Unknown'}</strong>
                                        </div>
                                        <div class="text-end">
                                            <div class="fw-bold text-primary">${(lang.post_count || 0).toLocaleString()} posts</div>
                                            <small class="text-muted">${(lang.thread_count || 0).toLocaleString()} threads</small>
                                        </div>
                                    </div>
                                    <div class="progress mb-3" style="height: 6px;">
                                        <div class="progress-bar" style="width: ${lang.percentage || 0}%"></div>
                                    </div>
                                `).join('') : '<p class="text-muted">No language data available</p>'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="bi bi-person-badge"></i> Most Active Users</h5>
                            </div>
                            <div class="card-body">
                                ${stats.mostActiveUsers && stats.mostActiveUsers.length > 0 ? stats.mostActiveUsers.slice(0, 15).map((user, index) => `
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <div class="flex-grow-1">
                                            <span class="badge bg-${index < 3 ? 'warning' : 'secondary'} me-2">${index + 1}</span>
                                            <strong>${user.name || 'Unknown User'}</strong>
                                        </div>
                                        <div class="text-end">
                                            <span class="text-primary">${(user.post_count || 0).toLocaleString()} posts</span>
                                        </div>
                                    </div>
                                `).join('') : '<p class="text-muted">No user data available</p>'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <button onclick="navigateToHome()" class="btn btn-primary">
                        <i class="bi bi-arrow-left"></i> Back to Forum
                    </button>
                </div>
                
                <!-- Close container wrapper -->
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = content;
            
        } catch (error) {
            console.error('Failed to load statistics:', error);
            showError('main-content', 'Failed to load statistics. Please try again.');
        }
    }
    
    // Load search page
    async loadSearchPage(params = {}) {
        const { search, language, category, page = 1 } = params;
        
        if (!search) {
            this.loadHomePage(params);
            return;
        }
        
        this.updateBreadcrumb([
            { text: 'Forum', icon: 'bi-house', action: 'navigateToHome()' },
            { text: 'Search Results' }
        ]);
        
        try {
            showLoading('main-content');
            
            const response = await threadsAPI.getThreads({
                search,
                language,
                category,
                page,
                limit: 20
            });
            
            if (!response.success) {
                throw new Error('Search failed');
            }
            
            const { threads } = response.data;
            
            let content = createSearchInfo(search, language, threads.length);
            content += createThreadList(threads, search);
            
            document.getElementById('main-content').innerHTML = content;
            
        } catch (error) {
            console.error('Search failed:', error);
            showError('main-content', 'Search failed. Please try again.');
        }
    }
    
    // Update filters UI
    updateFilters(params) {
        this.currentFilters = { ...this.currentFilters, ...params };
        
        // Update select elements
        const languageSelect = document.getElementById('language-select');
        const categorySelect = document.getElementById('category-select');
        const searchInput = document.getElementById('search-input');
        
        if (languageSelect) {
            languageSelect.value = params.language || '';
        }
        
        if (categorySelect) {
            categorySelect.value = params.category || '';
        }
        
        if (searchInput && params.search) {
            searchInput.value = params.search;
        }
        
        // Update categories when language changes
        if (params.language !== this.currentFilters.language) {
            this.populateCategories(params.language);
        }
    }
    
    // Update breadcrumb
    updateBreadcrumb(items) {
        const breadcrumbNav = document.getElementById('breadcrumb-nav');
        const breadcrumbContent = document.getElementById('breadcrumb-content');
        
        if (!breadcrumbNav || !breadcrumbContent) return;
        
        if (items.length > 1) {
            breadcrumbContent.innerHTML = createBreadcrumb(items);
            breadcrumbNav.style.display = 'block';
        } else {
            breadcrumbNav.style.display = 'none';
        }
    }
    
    // Update pagination
    updatePagination(pagination) {
        const paginationNav = document.getElementById('pagination-nav');
        const paginationContent = document.getElementById('pagination-content');
        
        if (!paginationNav || !paginationContent) return;
        
        if (pagination && pagination.totalPages > 1) {
            paginationContent.innerHTML = createPagination(pagination);
            paginationNav.style.display = 'block';
        } else {
            paginationNav.style.display = 'none';
        }
    }
    
    // WebSocket methods removed - static archive only
    
    // Utility method to get language flag
    getLanguageFlag(language) {
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
}

// Create global application instance
const forumApp = new ForumApplication();

// Export for global access
window.forumApp = forumApp;
window.router = router;

export default forumApp;