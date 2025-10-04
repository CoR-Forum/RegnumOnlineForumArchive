import moment from 'moment';
import sanitizeHtml from 'sanitize-html';

// Format timestamp from "05-09-2008, 09:39 PM" format to readable format
export function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';

  try {
    // Try the main expected format first
    let dt = moment(timestamp, 'DD-MM-YYYY, hh:mm A');
    if (dt.isValid()) {
      return dt.format('MMM D, YYYY \\a\\t h:mm A');
    }
    
    // Try alternative formats that might exist
    const formats = [
      'MM-DD-YYYY, hh:mm A',  // US format
      'DD/MM/YYYY, hh:mm A',  // Different separator
      'MM/DD/YYYY, hh:mm A',  // US format with slashes
      'YYYY-MM-DD hh:mm A',   // ISO-like format
    ];
    
    for (const format of formats) {
      dt = moment(timestamp, format);
      if (dt.isValid()) {
        return dt.format('MMM D, YYYY \\a\\t h:mm A');
      }
    }
    
    // If all parsing fails, return original timestamp
    return timestamp;
    
  } catch (error) {
    // Fallback if parsing fails
    return timestamp;
  }
}

// Extract language from thread path
export function getLanguageFromPath(path) {
  if (path.includes('/Español/')) return 'Español';
  if (path.includes('/English/')) return 'English';
  if (path.includes('/Português/')) return 'Português';
  if (path.includes('/Deutsch/')) return 'Deutsch';
  if (path.includes('/Français/')) return 'Français';
  if (path.includes('/Italiano/')) return 'Italiano';
  return 'Other';
}

// Extract category from thread path
export function getCategoryFromPath(path) {
  // Extract category from path like "Calendar/Champions of Regnum/Español/Discusión general"
  const parts = path.split('/');
  if (parts.length >= 4) {
    return parts[parts.length - 1];
  }
  return 'General';
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

// Sanitize HTML content for safe display
export function sanitizeHtmlContent(html) {
  if (!html) return '';
  
  const allowedTags = [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'img', 'div', 'span', 
    'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
  ];
  
  const allowedAttributes = {
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class', 'style']
  };
  
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedIframeHostnames: []
  });
}

// Truncate text to specified length
export function truncateText(text, length = 100) {
  if (!text) return '';
  
  const plainText = text.replace(/<[^>]*>/g, ''); // Strip HTML tags
  if (plainText.length <= length) {
    return plainText;
  }
  return plainText.substr(0, length) + '...';
}

// Create pagination object
export function getPagination(currentPage, totalItems, itemsPerPage, baseUrl) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pagination = [];
  
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    pagination.push({
      page: i,
      url: `${baseUrl}&page=${i}`,
      active: i === currentPage
    });
  }
  
  return {
    pages: pagination,
    prev: currentPage > 1 ? `${baseUrl}&page=${currentPage - 1}` : null,
    next: currentPage < totalPages ? `${baseUrl}&page=${currentPage + 1}` : null,
    totalPages,
    currentPage,
    totalItems,
    itemsPerPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    startItem: (currentPage - 1) * itemsPerPage + 1,
    endItem: Math.min(currentPage * itemsPerPage, totalItems)
  };
}

// Validate and normalize pagination parameters
export function validatePagination(page, limit) {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    offset: (validatedPage - 1) * validatedLimit
  };
}

// Create a standardized API response
export function createApiResponse(data, message = 'Success', status = 200) {
  return {
    success: status >= 200 && status < 300,
    status,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

// Create error response
export function createErrorResponse(message, status = 500, details = null) {
  return {
    success: false,
    status,
    message,
    error: details,
    timestamp: new Date().toISOString()
  };
}

// Convert database results to frontend-friendly format
export function formatThreadForApi(thread) {
  if (!thread) return null;
  
  return {
    id: thread.id,
    name: thread.name,
    path: thread.path,
    language: getLanguageFromPath(thread.path),
    category: getCategoryFromPath(thread.path),
    postCount: thread.post_count || 0,
    lastPoster: thread.last_poster,
    lastPostTime: thread.last_post_time ? formatTimestamp(thread.last_post_time) : null,
    createdTime: thread.created_time ? formatTimestamp(thread.created_time) : null,
    threadCreator: thread.thread_creator
  };
}

// Convert user data for API
export function formatUserForApi(user) {
  if (!user) return null;
  
  return {
    id: user.id,
    name: user.name,
    postCount: user.post_count || user.total_posts || 0,
    threadCount: user.thread_count || user.total_threads || 0,
    firstPost: user.first_post ? formatTimestamp(user.first_post) : null,
    lastPost: user.last_post ? formatTimestamp(user.last_post) : null
  };
}

// Convert post data for API
export function formatPostForApi(post) {
  if (!post) return null;
  
  return {
    id: post.id,
    threadId: post.thread_id,
    postNo: post.post_no,
    userId: post.user_id,
    username: post.username || 'Guest',
    timestamp: post.timestamp ? formatTimestamp(post.timestamp) : null,
    message: sanitizeHtmlContent(post.message),
    threadName: post.thread_name,
    threadPath: post.thread_path
  };
}

// Generate search highlights
export function highlightSearchTerm(text, searchTerm) {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Debounce function for search
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