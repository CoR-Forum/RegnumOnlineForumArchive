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
    enableAutoScrollSave,
    formatNumber
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
    createCategoriesSidebarGrouped,
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
        
        // Track loading start time
        this.loadingStartTime = Date.now();
        
                // Initialize the forum app
        this.init();
        
        // Load stats for footer
        this.loadFooterStats();
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
    
    // Hide loading overlay (ensures it shows for at least 1.5 seconds)
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const elapsedTime = Date.now() - this.loadingStartTime;
            const minDisplayTime = 500; // 1.5 seconds
            const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
            
            setTimeout(() => {
                overlay.classList.add('fade-out');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 500);
            }, remainingTime);
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
        
        // Update SEO for home page with enhanced metadata
        let seoTitle = 'Regnum Online Forum Archive';
        let seoDescription = 'Champions of Regnum community forum archive. Browse threads, posts, and discussions from the Regnum Online gaming community.';
        let seoUrl = '/';
        let seoKeywords = 'Regnum Online, Champions of Regnum, forum archive, gaming community, discussions, threads, posts';
        
        if (language) {
            seoTitle = `${language} Discussions - Regnum Online Forum Archive`;
            seoDescription = `Browse ${language} discussions and threads from the Champions of Regnum community. Discover gaming strategies, community events, and player interactions.`;
            seoUrl = `/?language=${encodeURIComponent(language)}`;
            seoKeywords = `Regnum Online, Champions of Regnum, ${language}, forum archive, gaming community, discussions, threads, posts, ${language} language`;
        }
        
        if (category) {
            seoTitle = `${category} - ${language} Discussions`;
            seoDescription = `Browse ${category} discussions in ${language} from the Champions of Regnum community. Find specific topics and conversations about ${category.toLowerCase()}.`;
            seoUrl = `/?language=${encodeURIComponent(language)}&category=${encodeURIComponent(category)}`;
            seoKeywords = `${category}, ${language}, Regnum Online, Champions of Regnum, forum archive, gaming community, discussions, threads`;
        }
        
        updateSEO({
            title: seoTitle,
            description: seoDescription,
            url: seoUrl,
            keywords: seoKeywords,
            type: 'website',
            locale: language === 'Español' ? 'es_ES' : language === 'Português' ? 'pt_PT' : language === 'Deutsch' ? 'de_DE' : language === 'Français' ? 'fr_FR' : language === 'Italiano' ? 'it_IT' : 'en_US'
        });
        
        // Generate structured data for the homepage
        generateStructuredData('WebSite', {
            name: seoTitle,
            description: seoDescription,
            url: window.location.origin + seoUrl,
            publisher: {
                '@type': 'Organization',
                name: 'Champions of Regnum Community',
                logo: {
                    '@type': 'ImageObject',
                    url: window.location.origin + '/assets/cor-logo.png'
                }
            },
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: window.location.origin + '/?search={search_term_string}'
                },
                'query-input': 'required name=search_term_string'
            }
        });
        
        try {
            showLoading('main-content');
            
            // Load threads - use random threads on main index page
            const threadsResponse = await threadsAPI.getThreads({
                language,
                category,
                page,
                limit: 20,
                random: !language && !category // Get random threads only on main index page
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
            
            // Skip categories overview - we'll show sidebar instead
            
            // Create main content area
            content += '<div class="row">';
            
            // Add categories sidebar - always show it
            try {
                if (language) {
                    // Show categories for specific language
                    const categoriesResponse = await threadsAPI.getCategories(language);
                    if (categoriesResponse.success) {
                        content += createCategoriesSidebar(categoriesResponse.data, category);
                    }
                } else {
                    // Show all categories grouped by language
                    const categoriesResponse = await threadsAPI.getCategories();
                    if (categoriesResponse.success && categoriesResponse.data) {
                        content += createCategoriesSidebarGrouped(categoriesResponse.data, language, category);
                    }
                }
            } catch (error) {
                console.warn('Failed to load categories sidebar:', error);
            }
            
            // Add threads list
            const mainColClass = 'col-md-9';
            content += `<div class="${mainColClass}">`;
            
            // Add header for random threads on main page
            if (!language && !category) {
                content += `
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h4><i class="bi bi-shuffle text-primary"></i> Random Forum Threads</h4>
                        <button class="btn btn-outline-primary btn-sm" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Shuffle Again
                        </button>
                    </div>
                `;
            }
            
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
            
            // Update SEO for thread page with thread title as primary focus
            let threadDescription = thread.name;
            
            // Enhance description with first post content if available
            if (posts && posts.length > 0 && posts[0].message) {
                // Clean HTML tags and extract plain text from first post
                const firstPostContent = posts[0].message
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .trim();
                
                if (firstPostContent.length > 10) { // Only use if meaningful content exists
                    const maxDescLength = 160;
                    
                    // If thread name is short enough, append first post content
                    if (thread.name.length < 100) {
                        const separator = ' - ';
                        const availableLength = maxDescLength - thread.name.length - separator.length - 3; // -3 for "..."
                        
                        if (availableLength > 20) { // Only add if we have meaningful space
                            let contentPart = firstPostContent.substring(0, availableLength);
                            
                            // Try to break at word boundary
                            const lastSpace = contentPart.lastIndexOf(' ');
                            if (lastSpace > availableLength * 0.6) { // If we can break at a reasonable point
                                contentPart = contentPart.substring(0, lastSpace);
                            }
                            
                            threadDescription = thread.name + separator + contentPart + (firstPostContent.length > availableLength ? '...' : '');
                        }
                    } else {
                        // Thread name is long, just use it and truncate if needed
                        if (thread.name.length > maxDescLength) {
                            threadDescription = thread.name.substring(0, maxDescLength - 3) + '...';
                        }
                    }
                } else {
                    // No meaningful first post content, enhance with category and language info
                    const contextInfo = ` - ${thread.category} discussion in ${thread.language}`;
                    const maxTitleLength = 160 - contextInfo.length;
                    
                    if (thread.name.length > maxTitleLength) {
                        threadDescription = thread.name.substring(0, maxTitleLength - 3) + '...' + contextInfo;
                    } else {
                        threadDescription = thread.name + contextInfo;
                    }
                }
            } else {
                // No posts available, enhance with category and language info
                const contextInfo = ` - ${thread.category} discussion in ${thread.language}`;
                const maxTitleLength = 160 - contextInfo.length;
                
                if (thread.name.length > maxTitleLength) {
                    threadDescription = thread.name.substring(0, maxTitleLength - 3) + '...' + contextInfo;
                } else {
                    threadDescription = thread.name + contextInfo;
                }
            }
                
            updateSEO({
                title: thread.name,
                description: threadDescription,
                url: `/threads/${threadId}`,
                keywords: `${thread.name}, ${thread.language}, ${thread.category}, Regnum Online, Champions of Regnum, forum, discussion`,
                type: 'article',
                author: thread.threadCreator,
                publishedTime: thread.createdTime,
                modifiedTime: thread.lastPostTime || thread.createdTime,
                section: thread.category,
                imageAlt: `${thread.name} - ${thread.category} discussion in ${thread.language}`
            });
            
            // Generate structured data for the thread with enhanced content
            const structuredDataPayload = {
                headline: thread.name,
                description: threadDescription,
                author: {
                    '@type': 'Person',
                    name: thread.threadCreator || 'Unknown'
                },
                publisher: {
                    '@type': 'Organization',
                    name: 'Regnum Online Forum Archive',
                    logo: {
                        '@type': 'ImageObject',
                        url: window.location.origin + '/assets/cor-logo.png'
                    }
                },
                datePublished: thread.createdTime,
                dateModified: thread.lastPostTime || thread.createdTime,
                articleSection: thread.category,
                inLanguage: thread.language,
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': window.location.href
                }
            };
            
            // Add article body if we have first post content
            if (posts && posts.length > 0 && posts[0].message) {
                const cleanContent = posts[0].message.replace(/<[^>]*>/g, '').trim();
                if (cleanContent.length > 10) {
                    structuredDataPayload.articleBody = cleanContent.substring(0, 500) + (cleanContent.length > 500 ? '...' : '');
                }
            }
            
            generateStructuredData('Article', structuredDataPayload);
            
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
        
        // Update SEO for users page with enhanced metadata
        const usersTitle = search ? `"${search}" - User Search Results` : 'Community Members - Regnum Online Forum Archive';
        const usersDescription = search ? 
            `Search results for "${search}" among Champions of Regnum community members. Find forum contributors, active players, and community participants.` :
            'Browse Champions of Regnum community members and their forum participation. Discover active players, forum contributors, and community statistics.';
        const usersUrl = search ? `/users?search=${encodeURIComponent(search)}` : '/users';
        const usersKeywords = search ? 
            `${search}, user search, members, community, Regnum Online, Champions of Regnum, forum archive, players, contributors` :
            'users, members, community, Regnum Online, Champions of Regnum, forum archive, players, contributors, statistics';
            
        updateSEO({
            title: usersTitle,
            description: usersDescription,
            url: usersUrl,
            keywords: usersKeywords,
            type: 'website',
            locale: 'en_US'
        });
        
        // Generate structured data for users page
        generateStructuredData('CollectionPage', {
            name: usersTitle,
            description: usersDescription,
            url: window.location.origin + usersUrl,
            mainEntity: {
                '@type': 'ItemList',
                name: 'Community Members',
                description: 'List of Champions of Regnum community members'
            },
            publisher: {
                '@type': 'Organization',
                name: 'Champions of Regnum Community',
                logo: {
                    '@type': 'ImageObject',
                    url: window.location.origin + '/assets/cor-logo.png'
                }
            }
        });
        
        // Generate breadcrumb structured data
        generateBreadcrumbStructuredData(breadcrumbs);
        
        try {
            showLoading('main-content');
            
            const response = await usersAPI.getUsers({ search, page, limit: 20 });
            
            if (!response.success) {
                throw new Error('Failed to load users');
            }
            
            const { users, pagination } = response.data;
            
            let content = '';
            
            // Add container wrapper (no page header to avoid double logo)
            content += '<div class="container">';
            
            // Add page title
            content += `
                <div class="mb-4">
                    <h2><i class="bi bi-people-fill"></i> Community Members</h2>
                    <p class="text-muted">Browse the Champions of Regnum community members and their forum participation.</p>
                </div>
            `;
            
            // Add search info if searching
            if (search) {
                content += createSearchInfo(search, null, users.length);
            }
            
            // Add results info
            content += `
                <div class="mb-4">
                    <h5 class="mb-0">
                        <i class="bi bi-people-fill"></i> 
                        ${search ? 'Search Results' : 'All Users'}
                        <span class="badge bg-primary ms-2">${formatNumber(pagination.totalUsers || 0)}</span>
                    </h5>
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
                { text: 'Forum', icon: 'bi-house', action: 'navigateToHome()', url: '/' },
                { text: 'Users', action: 'navigateToUsers()', url: '/users' },
                { text: user.name, url: `/users/${userId}` }
            ]);
            
            // Update SEO for user profile page
            const profileTitle = `${user.name} - Community Member Profile`;
            const profileDescription = `View ${user.name}'s profile in the Champions of Regnum community. ${user.postCount || 0} posts, ${user.threadCount || 0} threads. Member since ${user.firstPost || 'unknown'}.`;
            const profileUrl = `/users/${userId}`;
            const profileKeywords = `${user.name}, user profile, community member, Regnum Online, Champions of Regnum, forum archive, posts, threads, ${user.postCount || 0} posts`;
            
            updateSEO({
                title: profileTitle,
                description: profileDescription,
                url: profileUrl,
                keywords: profileKeywords,
                type: 'profile',
                author: user.name,
                locale: 'en_US'
            });
            
            // Generate structured data for user profile
            generateStructuredData('ProfilePage', {
                name: profileTitle,
                description: profileDescription,
                url: window.location.origin + profileUrl,
                mainEntity: {
                    '@type': 'Person',
                    name: user.name,
                    identifier: userId,
                    memberOf: {
                        '@type': 'Organization',
                        name: 'Champions of Regnum Community'
                    },
                    agentInteractionStatistic: [
                        {
                            '@type': 'InteractionCounter',
                            interactionType: 'https://schema.org/CreateAction',
                            name: 'Posts Created',
                            userInteractionCount: user.postCount || 0
                        },
                        {
                            '@type': 'InteractionCounter',
                            interactionType: 'https://schema.org/CreateAction',
                            name: 'Threads Created',
                            userInteractionCount: user.threadCount || 0
                        }
                    ]
                },
                publisher: {
                    '@type': 'Organization',
                    name: 'Champions of Regnum Community',
                    logo: {
                        '@type': 'ImageObject',
                        url: window.location.origin + '/assets/cor-logo.png'
                    }
                }
            });
            
            // Generate breadcrumb structured data
            generateBreadcrumbStructuredData([
                { text: 'Forum', url: window.location.origin + '/' },
                { text: 'Users', url: window.location.origin + '/users' },
                { text: user.name, url: window.location.origin + profileUrl }
            ]);
            
            // Load user posts and threads with pagination
            const postsPage = params.postsPage || 1;
            const threadsPage = params.threadsPage || 1;
            const [userPostsResponse, userThreadsResponse] = await Promise.all([
                usersAPI.getUserPosts(userId, postsPage, 20),
                usersAPI.getUserThreads(userId, threadsPage, 20)
            ]);
            
            const userPosts = userPostsResponse.success ? userPostsResponse.data.posts || [] : [];
            const userThreads = userThreadsResponse.success ? userThreadsResponse.data.threads || [] : [];
            const postsPagination = userPostsResponse.success ? userPostsResponse.data.pagination : null;
            const threadsPagination = userThreadsResponse.success ? userThreadsResponse.data.pagination : null;
            
            // Determine active tab - posts first by default
            const activeTab = params.tab || 'posts';
            
            // Build comprehensive user profile with tabs
            const content = `
                <div class="container">
                    <div class="card mb-4">
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
                    
                    <!-- Tabbed Navigation -->
                    <div class="card">
                        <div class="card-header p-0">
                            <ul class="nav nav-tabs card-header-tabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <a class="nav-link ${activeTab === 'posts' ? 'active' : ''}" 
                                       href="#" 
                                       onclick="event.preventDefault(); switchUserTab('posts', ${userId}); return false;"
                                       role="tab">
                                        <i class="bi bi-chat-dots"></i> 
                                        Posts 
                                        <span class="badge bg-light text-dark ms-1">${user.postCount || 0}</span>
                                    </a>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <a class="nav-link ${activeTab === 'threads' ? 'active' : ''}" 
                                       href="#" 
                                       onclick="event.preventDefault(); switchUserTab('threads', ${userId}); return false;"
                                       role="tab">
                                        <i class="bi bi-chat-text"></i> 
                                        Threads 
                                        <span class="badge bg-light text-dark ms-1">${user.threadCount || 0}</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <!-- Posts Tab Content -->
                            <div class="tab-content ${activeTab === 'posts' ? '' : 'd-none'}" id="posts-tab">
                                ${postsPagination ? `
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="mb-0">User Posts</h6>
                                        <small class="text-muted">Page ${postsPagination.page} of ${postsPagination.totalPages} (${postsPagination.totalPosts} total)</small>
                                    </div>
                                ` : ''}
                                
                                ${userPosts.length > 0 ? `
                                    <div class="list-group list-group-flush">
                                        ${userPosts.map(post => `
                                            <div class="list-group-item list-group-item-action" onclick="navigateToThread(${post.threadId})" style="cursor: pointer;">
                                                <div class="d-flex w-100 justify-content-between">
                                                    <h6 class="mb-1">${post.threadName || 'Untitled Thread'}</h6>
                                                    <small class="text-muted">${post.createdTime || 'No date'}</small>
                                                </div>
                                                <p class="mb-2 text-truncate" style="max-height: 3rem; overflow: hidden;">
                                                    ${post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : 'No content'}
                                                </p>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-muted">
                                                        <span class="badge bg-secondary me-1">${post.language || 'Unknown'}</span>
                                                        <span class="badge bg-info">${post.category || 'General'}</span>
                                                    </small>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    
                                    ${createPagination(postsPagination, `user-posts-${userId}`, {
                                        itemType: 'posts'
                                    })}
                                ` : '<div class="text-center py-5 text-muted"><i class="bi bi-chat-dots display-1 opacity-25"></i><p class="mt-3">No posts found for this user.</p></div>'}
                            </div>
                            
                            <!-- Threads Tab Content -->
                            <div class="tab-content ${activeTab === 'threads' ? '' : 'd-none'}" id="threads-tab">
                                ${threadsPagination ? `
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="mb-0">User Threads</h6>
                                        <small class="text-muted">Page ${threadsPagination.page} of ${threadsPagination.totalPages} (${threadsPagination.totalThreads} total)</small>
                                    </div>
                                ` : ''}
                                
                                ${userThreads.length > 0 ? `
                                    <div class="list-group list-group-flush">
                                        ${userThreads.map(thread => `
                                            <div class="list-group-item list-group-item-action" onclick="navigateToThread(${thread.id})" style="cursor: pointer;">
                                                <div class="d-flex w-100 justify-content-between">
                                                    <h6 class="mb-1">${thread.name || 'Untitled Thread'}</h6>
                                                    <small class="text-muted">${thread.createdTime || 'No date'}</small>
                                                </div>
                                                <p class="mb-1 text-muted">
                                                    <span class="badge bg-secondary me-2">${thread.language || 'Unknown'}</span>
                                                    <span class="badge bg-info">${thread.category || 'General'}</span>
                                                </p>
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-muted">${thread.postCount || 0} posts</small>
                                                    ${thread.lastPostTime ? `<small class="text-muted">Last: ${thread.lastPostTime}</small>` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    
                                    ${createPagination(threadsPagination, `user-threads-${userId}`, {
                                        itemType: 'threads'
                                    })}
                                ` : '<div class="text-center py-5 text-muted"><i class="bi bi-chat-text display-1 opacity-25"></i><p class="mt-3">No threads found for this user.</p></div>'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center mt-4">
                        <button onclick="navigateToUsers()" class="btn btn-outline-primary">
                            <i class="bi bi-arrow-left"></i> Back to Users
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('main-content').innerHTML = content;
            
        } catch (error) {
            console.error('Failed to load user profile:', error);
            showError('main-content', 'Failed to load user profile. Please try again.');
        }
    }

    // Handle tab switching for user profiles
    switchUserTab(tab, userId) {
        const params = { 
            tab,
            threadsPage: tab === 'threads' ? 1 : undefined,
            postsPage: tab === 'posts' ? 1 : undefined
        };
        
        // Update URL to reflect tab change
        const url = `/users/${userId}?tab=${tab}`;
        window.history.pushState({ page: 'user', userId, tab }, '', url);
        
        this.loadUserProfilePage(userId, params);
    }

    // Navigate to user profile with specific tab and page
    navigateToUserTab(tab, userId, page) {
        const params = { tab };
        if (tab === 'threads') {
            params.threadsPage = page;
        } else if (tab === 'posts') {
            params.postsPage = page;
        }
        
        // Build URL with proper parameters
        let url = `/users/${userId}?tab=${tab}`;
        if (tab === 'threads') {
            url += `&threadsPage=${page}`;
        } else if (tab === 'posts') {
            url += `&postsPage=${page}`;
        }
        
        window.history.pushState({ page: 'user', userId, tab, params }, '', url);
        this.loadUserProfilePage(userId, params);
    }
    
    // Load stats for footer display
    async loadFooterStats() {
        try {
            const response = await statsAPI.getOverview();
            if (response.success && response.data) {
                const stats = response.data;
                document.getElementById('stats-users').textContent = formatNumber(stats.totalUsers || 0);
                document.getElementById('stats-threads').textContent = formatNumber(stats.totalThreads || 0);
                document.getElementById('stats-posts').textContent = formatNumber(stats.totalPosts || 0);
            }
        } catch (error) {
            console.error('Failed to load footer stats:', error);
            document.getElementById('stats-users').textContent = 'N/A';
            document.getElementById('stats-threads').textContent = 'N/A';
            document.getElementById('stats-posts').textContent = 'N/A';
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
            { text: 'Forum', icon: 'bi-house', action: 'navigateToHome()', url: '/' },
            { text: 'Search Results', url: `/search?search=${encodeURIComponent(search)}` }
        ]);
        
        // Update SEO for search results page
        const searchTitle = `"${search}" - Search Results`;
        const searchDescription = `Search results for "${search}" in the Champions of Regnum forum archive. Find threads, posts, and discussions${language ? ` in ${language}` : ''}${category ? ` about ${category}` : ''}.`;
        const searchUrl = `/search?search=${encodeURIComponent(search)}${language ? `&language=${encodeURIComponent(language)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
        const searchKeywords = `${search}, search results, Regnum Online, Champions of Regnum, forum archive${language ? `, ${language}` : ''}${category ? `, ${category}` : ''}, threads, posts, discussions`;
        
        updateSEO({
            title: searchTitle,
            description: searchDescription,
            url: searchUrl,
            keywords: searchKeywords,
            type: 'website',
            locale: language === 'Español' ? 'es_ES' : language === 'Português' ? 'pt_PT' : language === 'Deutsch' ? 'de_DE' : language === 'Français' ? 'fr_FR' : language === 'Italiano' ? 'it_IT' : 'en_US'
        });
        
        // Generate structured data for search results
        generateStructuredData('SearchResultsPage', {
            name: searchTitle,
            description: searchDescription,
            url: window.location.origin + searchUrl,
            mainEntity: {
                '@type': 'ItemList',
                name: `Search Results for "${search}"`,
                description: `Forum threads and discussions matching "${search}"`
            },
            publisher: {
                '@type': 'Organization',
                name: 'Champions of Regnum Community',
                logo: {
                    '@type': 'ImageObject',
                    url: window.location.origin + '/assets/cor-logo.png'
                }
            }
        });
        
        // Generate breadcrumb structured data
        generateBreadcrumbStructuredData([
            { text: 'Forum', url: window.location.origin + '/' },
            { text: 'Search Results', url: window.location.origin + searchUrl }
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
            // Add item information to pagination for better display
            const enhancedPagination = {
                ...pagination,
                totalItems: pagination.totalUsers || pagination.totalThreads || pagination.totalPosts,
                itemType: pagination.totalUsers ? 'users' : 
                         pagination.totalThreads ? 'threads' : 
                         pagination.totalPosts ? 'posts' : 'items'
            };
            paginationContent.innerHTML = createPagination(enhancedPagination);
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
    
    // Expose scroll position management methods
    saveScrollPosition(key = 'homepage') {
        saveScrollPosition(key);
    }
    
    restoreScrollPosition(key = 'homepage', delay = 100) {
        return restoreScrollPosition(key, delay);
    }
    
    clearScrollPosition(key = 'homepage') {
        clearScrollPosition(key);
    }
}

// Create global application instance
const forumApp = new ForumApplication();

// Export for global access
window.forumApp = forumApp;
window.router = router;

export default forumApp;