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
        <div class="thread-list">
            ${threads.map(thread => createThreadItem(thread, searchTerm)).join('')}
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
        <div class="thread-item" onclick="navigateToThread(${thread.id})">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div>
                        <a href="#" class="thread-title" onclick="event.preventDefault(); navigateToThread(${thread.id})">
                            ${highlightedName}
                        </a>
                    </div>
                    <div class="thread-meta">
                        <div class="mb-1">
                            <i class="bi bi-folder"></i>
                            <a href="#" onclick="event.preventDefault(); filterByLanguage('${language}')" class="text-decoration-none">
                                ${getLanguageFlag(language)} ${sanitizeHtml(language)}
                            </a>
                            ›
                            <a href="#" onclick="event.preventDefault(); filterByCategory('${language}', '${category}')" class="text-decoration-none">
                                ${sanitizeHtml(category)}
                            </a>
                        </div>
                        <div class="small text-muted">
                            ${thread.threadCreator ? `
                                <span class="me-3">
                                    <i class="bi bi-plus-circle"></i>
                                    Created by <strong>${sanitizeHtml(thread.threadCreator)}</strong>
                                    ${thread.createdTime ? `on ${thread.createdTime}` : ''}
                                </span>
                            ` : ''}
                            ${thread.lastPoster && thread.lastPostTime ? `
                                <span>
                                    <i class="bi bi-clock"></i>
                                    Last by <strong>${sanitizeHtml(thread.lastPoster)}</strong>
                                    on ${thread.lastPostTime}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="thread-stats">
                        <div class="d-flex justify-content-end align-items-center gap-3">
                            <div class="text-center">
                                <div class="fw-bold text-primary">${formatNumber(thread.postCount || 0)}</div>
                                <div class="small text-muted">Posts</div>
                            </div>
                            <div>
                                <span class="btn btn-outline-primary btn-sm">
                                    <i class="bi bi-arrow-right"></i>
                                </span>
                            </div>
                        </div>
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
        <div class="post-card" id="${postId}">
            <div class="post-header">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <div class="post-author">
                            <i class="bi bi-person-circle"></i>
                            ${post.userId ? `
                                <a href="#" onclick="navigateToUser(${post.userId})" class="text-decoration-none fw-bold">
                                    ${sanitizeHtml(post.username)}
                                </a>
                            ` : `
                                <span class="fw-bold">${sanitizeHtml(post.username || 'Guest')}</span>
                            `}
                        </div>
                    </div>
                    <div class="col-md-6 text-md-end">
                        <div class="d-flex align-items-center justify-content-end gap-2">
                            <div class="post-number">
                                #${post.postNo || post.id}
                            </div>
                            <div class="post-date">
                                <i class="bi bi-clock"></i>
                                ${post.timestamp || 'Unknown time'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="post-content">
                ${post.message || '<em>No content available</em>'}
            </div>
            
            <div class="post-footer p-3 bg-light">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <small class="text-muted">
                            Post ID: ${post.id}
                        </small>
                    </div>
                    <div class="col-md-6 text-md-end">
                        <button class="btn btn-outline-secondary btn-sm" onclick="copyPostLink('${postId}')">
                            <i class="bi bi-link"></i> Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// User List Component
export function createUserList(users, searchTerm = null) {
    if (!users || users.length === 0) {
        return `
            <div class="error-state">
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
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card h-100 user-card">
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <div class="flex-shrink-0">
                            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                                <i class="bi bi-person-fill"></i>
                            </div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h6 class="card-title mb-2">
                                <a href="#" onclick="navigateToUser(${user.id})" class="text-decoration-none fw-bold">
                                    ${highlightedName}
                                </a>
                            </h6>
                            <div class="row text-center mb-2">
                                <div class="col-6">
                                    <div class="fw-bold text-primary">${formatNumber(user.postCount || 0)}</div>
                                    <small class="text-muted">Posts</small>
                                </div>
                                <div class="col-6">
                                    <div class="fw-bold text-success">${formatNumber(user.threadCount || 0)}</div>
                                    <small class="text-muted">Threads</small>
                                </div>
                            </div>
                            ${user.firstPost ? `
                                <small class="text-muted">
                                    <i class="bi bi-calendar-plus"></i>
                                    Joined: ${user.firstPost}
                                </small>
                                <br>
                            ` : ''}
                            ${user.lastPost ? `
                                <small class="text-muted">
                                    <i class="bi bi-clock"></i>
                                    Last seen: ${user.lastPost}
                                </small>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <button onclick="navigateToUser(${user.id})" class="btn btn-outline-primary btn-sm w-100">
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
        <ul class="nav nav-tabs language-tabs">
            <li class="nav-item">
                <a class="nav-link ${!selectedLanguage ? 'active' : ''}" 
                   href="#" onclick="filterByLanguage(null)">
                    🌐 All Languages
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
export function createCategoriesOverview(categories) {
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

    return `
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="bi bi-grid"></i> All Categories
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${Object.entries(categoriesByLanguage).map(([lang, cats]) => `
                                <div class="col-md-4 mb-3">
                                    <h6 class="fw-bold text-primary mb-2">
                                        ${getLanguageFlag(lang)} ${sanitizeHtml(lang)}
                                    </h6>
                                    <div class="list-group list-group-flush">
                                        ${cats.slice(0, 6).map(cat => `
                                            <a href="#" onclick="filterByCategory('${lang}', '${cat.category}')" 
                                               class="list-group-item list-group-item-action py-2 border-0">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <span class="text-truncate">${sanitizeHtml(cat.category)}</span>
                                                    <span class="badge bg-secondary rounded-pill ms-2">${formatNumber(cat.thread_count || 0)}</span>
                                                </div>
                                            </a>
                                        `).join('')}
                                        ${cats.length > 6 ? `
                                            <a href="#" onclick="filterByLanguage('${lang}')" 
                                               class="list-group-item list-group-item-action py-2 border-0 text-primary">
                                                <small><i class="bi bi-arrow-right"></i> View all ${cats.length} categories</small>
                                            </a>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Categories Sidebar Component
export function createCategoriesSidebar(categories, selectedCategory = null) {
    if (!categories || categories.length === 0) {
        return '';
    }

    return `
        <div class="col-md-3">
            <div class="card category-card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="bi bi-tags"></i> Categories
                    </h5>
                </div>
                <div class="card-body p-0">
                    <div class="list-group list-group-flush">
                        <a href="#" onclick="clearCategoryFilter()" 
                           class="list-group-item list-group-item-action ${!selectedCategory ? 'active' : ''}">
                            <i class="bi bi-collection"></i> All Categories
                        </a>
                        ${categories.map(cat => `
                            <a href="#" onclick="filterByCategory(getCurrentLanguage(), '${cat.category}')" 
                               class="list-group-item list-group-item-action ${selectedCategory === cat.category ? 'active' : ''}">
                                ${sanitizeHtml(cat.category)}
                                <span class="badge bg-secondary rounded-pill float-end">${formatNumber(cat.thread_count || 0)}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Pagination Component
export function createPagination(pagination, baseUrl = '#') {
    if (!pagination || pagination.totalPages <= 1) {
        return '';
    }

    const { page, totalPages, hasNext, hasPrev } = pagination;
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    let paginationHTML = '<ul class="pagination justify-content-center">';

    // Previous buttons
    if (hasPrev) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="event.preventDefault(); navigateToPage(1); return false;">
                    <i class="bi bi-chevron-double-left"></i>
                </a>
            </li>
            <li class="page-item">
                <a class="page-link" href="#" onclick="event.preventDefault(); navigateToPage(${page - 1}); return false;">
                    <i class="bi bi-chevron-left"></i> Previous
                </a>
            </li>
        `;
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="event.preventDefault(); navigateToPage(${i}); return false;">
                    ${i}
                </a>
            </li>
        `;
    }

    // Next buttons
    if (hasNext) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="event.preventDefault(); navigateToPage(${page + 1}); return false;">
                    Next <i class="bi bi-chevron-right"></i>
                </a>
            </li>
            <li class="page-item">
                <a class="page-link" href="#" onclick="event.preventDefault(); navigateToPage(${totalPages}); return false;">
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
                            <a href="#" onclick="${item.action || 'void(0)'}">
                                ${item.icon ? `<i class="bi ${item.icon}"></i> ` : ''}
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
            <div class="col-md-3 col-sm-6">
                <div class="stats-card">
                    <div class="stats-number">${formatNumber(totalUsers)}</div>
                    <div class="stats-label">
                        <i class="bi bi-people"></i> Users
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stats-card" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);">
                    <div class="stats-number">${formatNumber(totalThreads)}</div>
                    <div class="stats-label">
                        <i class="bi bi-chat-text"></i> Threads
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stats-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
                    <div class="stats-number">${formatNumber(totalPosts)}</div>
                    <div class="stats-label">
                        <i class="bi bi-chat-dots"></i> Posts
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stats-card" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);">
                    <div class="stats-number">${totalLanguages}</div>
                    <div class="stats-label">
                        <i class="bi bi-globe"></i> Languages
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
        <div class="alert alert-info">
            <i class="bi bi-search"></i>
            Search results for: <strong>${sanitizeHtml(query)}</strong>
            ${language ? `in <strong>${getLanguageFlag(language)} ${sanitizeHtml(language)}</strong>` : ''}
            <span class="badge bg-primary ms-2">${formatNumber(resultCount)} results</span>
        </div>
    `;
}

// Page Header Component - Consistent header for all pages
export function createPageHeader(title, subtitle = null, icon = 'bi-shield-check') {
    return `
        <div class="page-header">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col-md-2 col-3 text-center">
                        <img src="/assets/cor-logo.png" alt="Champions of Regnum" class="forum-logo">
                    </div>
                    <div class="col-md-10 col-9">
                        <h2 class="mb-0">
                            <i class="${icon}"></i>
                            ${sanitizeHtml(title)}
                        </h2>
                        ${subtitle ? `<p class="lead mb-0">${sanitizeHtml(subtitle)}</p>` : ''}
                    </div>
                </div>
            </div>
        </div>
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
                        <div class="stats-info">
                            <span class="badge bg-primary">
                                <i class="bi bi-chat-dots"></i>
                                ${formatNumber(thread.postCount || 0)} posts
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}