// UI components for the Regnum Forum Archive
import { 
    formatTimestamp, 
    getLanguageFlag, 
    truncateText, 
    formatNumber,
    highlightSearchTerm,
    sanitizeHtml 
} from './utils.js';

// Thread List Component
export function createThreadList(threads, searchTerm = null) {
    if (!threads || threads.length === 0) {
        return `
            <div class="error-state">
                <i class="bi bi-chat-text display-1 text-muted mb-3"></i>
                <h4 class="text-muted">No threads found</h4>
                <p class="text-muted">Try adjusting your search or language filter.</p>
            </div>
        `;
    }

    return `
        <div class="card thread-list">
            <div class="card-body p-0">
                ${threads.map(thread => createThreadItem(thread, searchTerm)).join('')}
            </div>
        </div>
    `;
}

// Single Thread Item Component
export function createThreadItem(thread, searchTerm = null) {
    const highlightedName = searchTerm ? 
        highlightSearchTerm(thread.name, searchTerm) : 
        sanitizeHtml(thread.name);
    
    const language = thread.language || 'Unknown';
    const category = thread.category || 'General';
    
    return `
        <div class="thread-item border-bottom p-3" onclick="navigateToThread(${thread.id})">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div>
                        <a href="/threads/${thread.id}" class="thread-title h5 mb-2 d-block" onclick="event.preventDefault(); navigateToThread(${thread.id})">
                            ${highlightedName}
                        </a>
                    </div>
                    <div class="thread-meta text-muted small">
                        <div class="mb-1">
                            <i class="bi bi-folder"></i>
                            <a href="/?language=${encodeURIComponent(language)}" onclick="event.preventDefault(); filterByLanguage('${language}')" class="text-decoration-none">
                                ${getLanguageFlag(language)} ${sanitizeHtml(language)}
                            </a>
                            ›
                            <a href="/?language=${encodeURIComponent(language)}&category=${encodeURIComponent(category)}" onclick="event.preventDefault(); filterByCategory('${language}', '${category}')" class="text-decoration-none">
                                ${sanitizeHtml(category)}
                            </a>
                        </div>
                        ${thread.threadCreator ? `
                            <div class="mb-1">
                                <i class="bi bi-plus-circle"></i>
                                Created by ${thread.threadCreatorId ? `<a href="/users/${thread.threadCreatorId}" onclick="event.preventDefault(); event.stopPropagation(); navigateToUser(${thread.threadCreatorId})" class="text-decoration-none fw-bold">${sanitizeHtml(thread.threadCreator)}</a>` : `<span class="fw-bold">${sanitizeHtml(thread.threadCreator)}</span>`}
                                ${thread.createdTime ? `on ${thread.createdTime}` : ''}
                            </div>
                        ` : ''}
                        ${thread.lastPoster && thread.lastPostTime ? `
                            <div>
                                <i class="bi bi-clock"></i>
                                Last by ${thread.lastPosterId ? `<a href="/users/${thread.lastPosterId}" onclick="event.preventDefault(); event.stopPropagation(); navigateToUser(${thread.lastPosterId})" class="text-decoration-none fw-bold">${sanitizeHtml(thread.lastPoster)}</a>` : `<span class="fw-bold">${sanitizeHtml(thread.lastPoster)}</span>`}
                                on ${thread.lastPostTime}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="col-md-4 text-end">
                    <div class="thread-stats">
                        <div class="fw-bold text-primary h5">${formatNumber(thread.postCount || 0)}</div>
                        <div class="text-muted small">Posts</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Posts List Component
export function createPostsList(posts, thread = null) {
    if (!posts || posts.length === 0) {
        return `
            <div class="error-state">
                <i class="bi bi-chat-dots display-1 text-muted mb-3"></i>
                <h4 class="text-muted">No posts found</h4>
                <p class="text-muted">This thread appears to be empty.</p>
            </div>
        `;
    }

    return `
        <div class="posts-container" id="posts-container">
            ${posts.map(post => createPostItem(post)).join('')}
        </div>
    `;
}

// Single Post Item Component
export function createPostItem(post) {
    const postId = `post-${post.id}`;
    
    return `
        <div class="card post-card mb-4" id="${postId}">
            <div class="card-header">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-person-circle me-2 fs-4"></i>
                            ${post.userId && post.userId > 0 ? `
                                <a href="/users/${post.userId}" onclick="event.preventDefault(); navigateToUser(${post.userId})" class="text-decoration-none fw-bold">
                                    ${sanitizeHtml(post.username)}
                                </a>
                            ` : `
                                <span class="fw-bold">${sanitizeHtml(post.username || 'Guest')}</span>
                            `}
                            <span class="badge bg-primary ms-2">Post #${post.postNo || post.id}</span>
                            <button class="btn btn-outline-secondary btn-sm ms-2" onclick="copyPostLink('${postId}')" title="Copy link to this post">
                                <i class="bi bi-link-45deg"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <small class="text-muted">
                            <i class="bi bi-clock"></i>
                            ${post.timestamp || 'Unknown time'}
                        </small>
                    </div>
                </div>
            </div>
            
            <div class="card-body">
                ${post.message || '<em class="text-muted">No content available</em>'}
            </div>
            
            <div class="card-footer bg-light">
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">ID: ${post.id}</small>
                    <small class="text-muted">
                        <a href="#${postId}" class="text-decoration-none">
                            <i class="bi bi-hash"></i> Direct link
                        </a>
                    </small>
                </div>
            </div>
        </div>
    `;
}

// User List Component
export function createUserList(users, searchTerm = null) {
    if (!users || users.length === 0) {
        return `
            <div class="text-center py-5">
                <i class="bi bi-people display-1 text-muted mb-3"></i>
                <h4 class="text-muted">No users found</h4>
                <p class="text-muted">Try adjusting your search criteria.</p>
            </div>
        `;
    }

    return `
        <div class="row">
            ${users.map(user => createUserCard(user, searchTerm)).join('')}
        </div>
    `;
}

// User Card Component
export function createUserCard(user, searchTerm = null) {
    const highlightedName = searchTerm ? 
        highlightSearchTerm(user.name, searchTerm) : 
        sanitizeHtml(user.name);

    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 user-card">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                            <i class="bi bi-person-fill"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="card-title mb-1">
                                <a href="/users/${user.id}" onclick="event.preventDefault(); navigateToUser(${user.id})" class="text-decoration-none fw-bold">
                                    ${highlightedName}
                                </a>
                            </h6>
                            <div class="row text-center">
                                <div class="col-6">
                                    <div class="fw-bold text-primary">${formatNumber(user.postCount || 0)}</div>
                                    <small class="text-muted">Posts</small>
                                </div>
                                <div class="col-6">
                                    <div class="fw-bold text-success">${formatNumber(user.threadCount || 0)}</div>
                                    <small class="text-muted">Threads</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${user.firstPost ? `
                        <div class="text-muted small mb-1">
                            <i class="bi bi-calendar-plus"></i>
                            Joined: ${user.firstPost}
                        </div>
                    ` : ''}
                    ${user.lastPost ? `
                        <div class="text-muted small">
                            <i class="bi bi-clock"></i>
                            Last seen: ${user.lastPost}
                        </div>
                    ` : ''}
                </div>
                <div class="card-footer">
                    <button onclick="navigateToUser(${user.id})" class="btn btn-outline-primary w-100">
                        <i class="bi bi-eye"></i> View Profile
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Language Tabs Component
export function createLanguageTabs(languages, selectedLanguage = null) {
    return `
        <ul class="nav nav-tabs mb-4">
            <li class="nav-item">
                <a class="nav-link ${!selectedLanguage ? 'active' : ''}" 
                   href="#" onclick="filterByLanguage(null)">
                    <i class="bi bi-globe"></i> All Languages
                </a>
            </li>
            ${languages.map(lang => `
                <li class="nav-item">
                    <a class="nav-link ${selectedLanguage === lang.language ? 'active' : ''}" 
                       href="#" onclick="filterByLanguage('${lang.language}')">
                        ${getLanguageFlag(lang.language)} ${sanitizeHtml(lang.language)}
                    </a>
                </li>
            `).join('')}
        </ul>
    `;
}

// Categories Overview Component
export function createCategoriesOverview(categories, pagination = null, totalCategories = null) {
    if (!categories || categories.length === 0) {
        return '';
    }

    const categoriesByLanguage = {};
    categories.forEach(cat => {
        if (!categoriesByLanguage[cat.language]) {
            categoriesByLanguage[cat.language] = [];
        }
        categoriesByLanguage[cat.language].push(cat);
    });

    let overviewContent = `
        <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                    <i class="bi bi-grid"></i> All Categories
                </h5>
                ${totalCategories ? `<span class="badge bg-primary">${formatNumber(totalCategories)} total</span>` : ''}
            </div>
            <div class="card-body">
                <div class="row">
                    ${Object.entries(categoriesByLanguage).map(([lang, cats]) => `
                        <div class="col-lg-4 col-md-6 mb-3">
                            <h6 class="fw-bold text-primary mb-2">
                                ${getLanguageFlag(lang)} ${sanitizeHtml(lang)}
                            </h6>
                            <div class="list-group list-group-flush">
                                ${cats.map(cat => `
                                    <a href="#" onclick="filterByCategory('${lang}', '${cat.category}')" 
                                       class="list-group-item list-group-item-action py-2 border-0">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="text-truncate">${sanitizeHtml(cat.category)}</span>
                                            <span class="badge bg-secondary ms-2">${formatNumber(cat.thread_count || 0)}</span>
                                        </div>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
    `;

    // Add pagination if provided
    if (pagination && pagination.totalPages > 1) {
        overviewContent += `
            <div class="card-footer">
                <nav aria-label="Categories pagination">
                    ${createPagination(pagination, 'categories')}
                </nav>
            </div>
        `;
    }

    overviewContent += `
        </div>
    `;

    return overviewContent;
}

// Categories Sidebar Component
export function createCategoriesSidebar(categories, selectedCategory = null, pagination = null) {
    if (!categories || categories.length === 0) {
        return '';
    }

    let sidebarContent = `
        <div class="col-lg-3">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="bi bi-tags"></i> Categories
                    </h5>
                </div>
                <div class="list-group list-group-flush">
                    <a href="/" onclick="event.preventDefault(); clearCategoryFilter()" 
                       class="list-group-item list-group-item-action ${!selectedCategory ? 'active' : ''}">
                        <i class="bi bi-collection me-2"></i> All Categories
                    </a>
                    ${categories.map(cat => `
                        <a href="/?language=${encodeURIComponent(getCurrentLanguage())}&category=${encodeURIComponent(cat.category)}" onclick="event.preventDefault(); filterByCategory(getCurrentLanguage(), '${cat.category}')" 
                           class="list-group-item list-group-item-action ${selectedCategory === cat.category ? 'active' : ''}">
                            <div class="d-flex justify-content-between align-items-center">
                                <span>${sanitizeHtml(cat.category)}</span>
                                <span class="badge bg-secondary">${formatNumber(cat.thread_count || 0)}</span>
                            </div>
                        </a>
                    `).join('')}
                </div>
    `;

    // Add pagination if provided
    if (pagination && pagination.totalPages > 1) {
        sidebarContent += `
                <div class="card-footer">
                    <nav aria-label="Category pagination">
                        <ul class="pagination pagination-sm justify-content-center mb-0">
        `;
        
        const { page, totalPages, hasNext, hasPrev } = pagination;
        
        if (hasPrev) {
            sidebarContent += `
                            <li class="page-item">
                                <a class="page-link" href="#" onclick="navigateToCategoryPage(${page - 1})">
                                    <i class="bi bi-chevron-left"></i>
                                </a>
                            </li>
            `;
        }
        
        // Show a few page numbers around current page
        const startPage = Math.max(1, page - 1);
        const endPage = Math.min(totalPages, page + 1);
        
        for (let i = startPage; i <= endPage; i++) {
            sidebarContent += `
                            <li class="page-item ${i === page ? 'active' : ''}">
                                <a class="page-link" href="#" onclick="navigateToCategoryPage(${i})">${i}</a>
                            </li>
            `;
        }
        
        if (hasNext) {
            sidebarContent += `
                            <li class="page-item">
                                <a class="page-link" href="#" onclick="navigateToCategoryPage(${page + 1})">
                                    <i class="bi bi-chevron-right"></i>
                                </a>
                            </li>
            `;
        }
        
        sidebarContent += `
                        </ul>
                    </nav>
                </div>
        `;
    }
    
    sidebarContent += `
            </div>
        </div>
    `;

    return sidebarContent;
}

// Categories Sidebar Grouped by Language 
export function createCategoriesSidebarGrouped(allCategories, selectedLanguage = null, selectedCategory = null) {
    if (!allCategories || allCategories.length === 0) {
        return '';
    }

    // Group categories by language
    const categoriesByLanguage = {};
    allCategories.forEach(cat => {
        if (!categoriesByLanguage[cat.language]) {
            categoriesByLanguage[cat.language] = [];
        }
        categoriesByLanguage[cat.language].push(cat);
    });

    // Sort languages in specific order: ES, EN, DE, PT, then others
    const languageOrder = ['Español', 'English', 'Deutsch', 'Português'];
    const availableLanguages = Object.keys(categoriesByLanguage);
    const languages = languageOrder.filter(lang => availableLanguages.includes(lang))
        .concat(availableLanguages.filter(lang => !languageOrder.includes(lang)).sort());
    
    let sidebarContent = `
        <div class="col-lg-3">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="bi bi-tags"></i> Categories
                    </h5>
                </div>
                <div class="accordion" id="categoriesAccordion">
                    ${languages.map((lang, index) => `
                        <div class="accordion-item">
                            <h6 class="accordion-header" id="heading-${lang.replace(/\s+/g, '-').toLowerCase()}">
                                <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" 
                                        type="button" 
                                        data-bs-toggle="collapse" 
                                        data-bs-target="#collapse-${lang.replace(/\s+/g, '-').toLowerCase()}" 
                                        aria-expanded="${index === 0 ? 'true' : 'false'}" 
                                        aria-controls="collapse-${lang.replace(/\s+/g, '-').toLowerCase()}">
                                    <i class="bi bi-globe me-2"></i>
                                    ${sanitizeHtml(lang)}
                                    <span class="badge bg-secondary ms-2">${categoriesByLanguage[lang].length}</span>
                                </button>
                            </h6>
                            <div id="collapse-${lang.replace(/\s+/g, '-').toLowerCase()}" 
                                 class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" 
                                 aria-labelledby="heading-${lang.replace(/\s+/g, '-').toLowerCase()}" 
                                 data-bs-parent="#categoriesAccordion">
                                <div class="accordion-body p-0">
                                    <div class="list-group list-group-flush">
                                        <a href="/?language=${encodeURIComponent(lang)}" onclick="event.preventDefault(); filterByLanguage('${lang}')" 
                                           class="list-group-item list-group-item-action ${selectedLanguage === lang && !selectedCategory ? 'active' : ''}">
                                            <i class="bi bi-collection me-2"></i> All ${sanitizeHtml(lang)} Categories
                                        </a>
                                        ${categoriesByLanguage[lang].map(cat => `
                                            <a href="/?language=${encodeURIComponent(lang)}&category=${encodeURIComponent(cat.category)}" onclick="event.preventDefault(); filterByCategory('${lang}', '${cat.category}')" 
                                               class="list-group-item list-group-item-action ${selectedLanguage === lang && selectedCategory === cat.category ? 'active' : ''}">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <span class="ms-3">${sanitizeHtml(cat.category)}</span>
                                                    <span class="badge bg-secondary">${formatNumber(cat.thread_count || 0)}</span>
                                                </div>
                                            </a>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    return sidebarContent;
}

// Pagination Component
export function createPagination(pagination, context = 'default') {
    if (!pagination || pagination.totalPages <= 1) {
        return '';
    }

    const { page, totalPages, hasNext, hasPrev } = pagination;
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    // Determine navigation function based on context
    const navFunction = context === 'categories' ? 'navigateToCategoryPage' : 'navigateToPage';

    let paginationHTML = '<ul class="pagination justify-content-center">';

    // Previous buttons
    if (hasPrev) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="event.preventDefault(); ${navFunction}(1); return false;">
                    <i class="bi bi-chevron-double-left"></i>
                </a>
            </li>
            <li class="page-item">
                <a class="page-link" href="#" onclick="event.preventDefault(); ${navFunction}(${page - 1}); return false;">
                    <i class="bi bi-chevron-left"></i> Previous
                </a>
            </li>
        `;
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="event.preventDefault(); ${navFunction}(${i}); return false;">
                    ${i}
                </a>
            </li>
        `;
    }

    // Next buttons
    if (hasNext) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="event.preventDefault(); ${navFunction}(${page + 1}); return false;">
                    Next <i class="bi bi-chevron-right"></i>
                </a>
            </li>
            <li class="page-item">
                <a class="page-link" href="#" onclick="event.preventDefault(); ${navFunction}(${totalPages}); return false;">
                    <i class="bi bi-chevron-double-right"></i>
                </a>
            </li>
        `;
    }

    paginationHTML += '</ul>';

    return paginationHTML;
}

// Breadcrumb Component
export function createBreadcrumb(items) {
    if (!items || items.length === 0) {
        return '';
    }

    return `
        <ol class="breadcrumb">
            ${items.map((item, index) => {
                const isLast = index === items.length - 1;
                return `
                    <li class="breadcrumb-item ${isLast ? 'active' : ''}" ${isLast ? 'aria-current="page"' : ''}>
                        ${isLast ? sanitizeHtml(item.text) : `
                            <a href="#" onclick="${item.action || 'void(0)'}">                                ${item.icon ? `<i class="bi ${item.icon}"></i> ` : ''}
                                ${sanitizeHtml(item.text)}
                            </a>
                        `}
                    </li>
                `;
            }).join('')}
        </ol>
    `;
}

// Statistics Cards Component
export function createStatsCards(stats) {
    if (!stats || !stats.overview) {
        return '';
    }

    const { totalUsers, totalThreads, totalPosts, totalLanguages } = stats.overview;

    return `
        <div class="row mb-5">
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card text-white stats-card-users h-100">
                    <div class="card-body text-center">
                        <h2 class="display-4 mb-0">${formatNumber(totalUsers)}</h2>
                        <p class="mb-0">
                            <i class="bi bi-people"></i> Users
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card text-white stats-card-threads h-100">
                    <div class="card-body text-center">
                        <h2 class="display-4 mb-0">${formatNumber(totalThreads)}</h2>
                        <p class="mb-0">
                            <i class="bi bi-chat-text"></i> Threads
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card text-white stats-card-posts h-100">
                    <div class="card-body text-center">
                        <h2 class="display-4 mb-0">${formatNumber(totalPosts)}</h2>
                        <p class="mb-0">
                            <i class="bi bi-chat-dots"></i> Posts
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card text-white stats-card-languages h-100">
                    <div class="card-body text-center">
                        <h2 class="display-4 mb-0">${totalLanguages}</h2>
                        <p class="mb-0">
                            <i class="bi bi-globe"></i> Languages
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Search Results Info Component
export function createSearchInfo(query, language, resultCount) {
    if (!query) return '';

    return `
        <div class="alert alert-info d-flex align-items-center" role="alert">
            <i class="bi bi-search me-2"></i>
            <div class="flex-grow-1">
                Search results for: <strong>${sanitizeHtml(query)}</strong>
                ${language ? `in <strong>${getLanguageFlag(language)} ${sanitizeHtml(language)}</strong>` : ''}
            </div>
            <span class="badge bg-primary">${formatNumber(resultCount)} results</span>
        </div>
    `;
}

// Category Info Component
export function createCategoryInfo(language, category, threadCount) {
    if (!category) return '';

    return `
        <div class="alert alert-primary d-flex align-items-center" role="alert">
            <i class="bi bi-folder me-2"></i>
            <div class="flex-grow-1">
                Viewing category: <strong>${sanitizeHtml(category)}</strong>
                ${language ? `in <strong>${getLanguageFlag(language)} ${sanitizeHtml(language)}</strong>` : ''}
            </div>
            <span class="badge bg-white text-primary">${formatNumber(threadCount)} threads</span>
        </div>
    `;
}

// Language Info Component  
export function createLanguageInfo(language, threadCount) {
    if (!language) return '';

    return `
        <div class="alert alert-secondary d-flex align-items-center" role="alert">
            <i class="bi bi-translate me-2"></i>
            <div class="flex-grow-1">
                Viewing threads in: <strong>${getLanguageFlag(language)} ${sanitizeHtml(language)}</strong>
            </div>
            <span class="badge bg-white text-secondary">${formatNumber(threadCount)} threads</span>
        </div>
    `;
}

// Page Header Component - Consistent header for all pages
export function createPageHeader(title, subtitle = null, icon = 'bi-shield-check') {
    return `
        <header class="bg-primary text-white py-4 mb-4">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col-md-2 col-3 text-center">
                        <img src="/assets/cor-logo.png" alt="Champions of Regnum" class="img-fluid" style="max-height: 80px;">
                    </div>
                    <div class="col-md-10 col-9">
                        <h2 class="mb-0">
                            <i class="${icon}"></i>
                            ${sanitizeHtml(title)}
                        </h2>
                        ${subtitle ? `<p class="lead mb-2">${sanitizeHtml(subtitle)}</p>` : ''}
                        <div class="small">
                            <i class="bi bi-server"></i> 
                            Served by <a href="https://cor-forum.de" target="_blank" class="text-white text-decoration-underline">cor-forum.de</a>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    `;
}

// Thread Header Component
export function createThreadHeader(thread) {
    if (!thread) return '';

    return `
        <div class="card mb-4">
            <div class="card-header">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h2 class="mb-1">
                            <i class="bi bi-chat-text"></i>
                            ${sanitizeHtml(thread.name)}
                        </h2>
                        <div class="text-muted">
                            <i class="bi bi-folder"></i>
                            <a href="#" onclick="filterByLanguage('${thread.language}')" class="text-decoration-none">
                                ${getLanguageFlag(thread.language)} ${sanitizeHtml(thread.language)}
                            </a>
                            ›
                            <a href="#" onclick="filterByCategory('${thread.language}', '${thread.category}')" class="text-decoration-none">
                                ${sanitizeHtml(thread.category)}
                            </a>
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <span class="badge bg-primary fs-6">
                            <i class="bi bi-chat-dots"></i>
                            ${formatNumber(thread.postCount || 0)} posts
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}