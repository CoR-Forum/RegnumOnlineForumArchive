import express from 'express';
import db from '../models/database.js';
import { 
  createApiResponse, 
  createErrorResponse, 
  validatePagination, 
  formatThreadForApi,
  formatPostForApi
} from '../utils/helpers.js';

const router = express.Router();

// GET /api/threads - Get threads with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { language, category, search, page = 1, limit = 20 } = req.query;
    const pagination = validatePagination(page, limit);
    
    let threads;
    
    if (search) {
      // Search threads
      threads = await db.searchThreads(search, language);
    } else {
      // Get threads with optional filtering
      threads = await db.getThreads(
        language, 
        category, 
        pagination.limit, 
        pagination.offset
      );
    }
    
    // Format threads for API response
    const formattedThreads = threads.map(formatThreadForApi);
    
    res.json(createApiResponse({
      threads: formattedThreads,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        hasMore: formattedThreads.length === pagination.limit
      },
      filters: {
        language,
        category,
        search
      }
    }));
    
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json(createErrorResponse('Failed to fetch threads', 500, error.message));
  }
});

// GET /api/threads/:id - Get specific thread details
router.get('/:id', async (req, res) => {
  try {
    const threadId = parseInt(req.params.id);
    
    if (!threadId || threadId < 1) {
      return res.status(400).json(createErrorResponse('Invalid thread ID', 400));
    }
    
    const thread = await db.getThread(threadId);
    
    if (!thread) {
      return res.status(404).json(createErrorResponse('Thread not found', 404));
    }
    
    // Get additional thread statistics
    const postCount = await db.getPostCount(threadId);
    
    const formattedThread = {
      ...formatThreadForApi(thread),
      postCount
    };
    
    res.json(createApiResponse(formattedThread));
    
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json(createErrorResponse('Failed to fetch thread', 500, error.message));
  }
});

// GET /api/threads/:id/posts - Get posts for a specific thread
router.get('/:id/posts', async (req, res) => {
  try {
    const threadId = parseInt(req.params.id);
    const { page = 1, limit = 20 } = req.query;
    
    if (!threadId || threadId < 1) {
      return res.status(400).json(createErrorResponse('Invalid thread ID', 400));
    }
    
    const pagination = validatePagination(page, limit);
    
    // Check if thread exists
    const thread = await db.getThread(threadId);
    if (!thread) {
      return res.status(404).json(createErrorResponse('Thread not found', 404));
    }
    
    // Get posts
    const posts = await db.getPosts(threadId, pagination.limit, pagination.offset);
    const totalPosts = await db.getPostCount(threadId);
    
    const formattedPosts = posts.map(formatPostForApi);
    
    res.json(createApiResponse({
      posts: formattedPosts,
      thread: formatThreadForApi(thread),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(totalPosts / pagination.limit),
        totalPosts,
        hasMore: pagination.offset + posts.length < totalPosts,
        hasPrev: pagination.page > 1
      }
    }));
    
  } catch (error) {
    console.error('Error fetching thread posts:', error);
    res.status(500).json(createErrorResponse('Failed to fetch thread posts', 500, error.message));
  }
});

// GET /api/threads/languages - Get available languages
router.get('/meta/languages', async (req, res) => {
  try {
    const languages = await db.getLanguages();
    res.json(createApiResponse(languages));
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json(createErrorResponse('Failed to fetch languages', 500, error.message));
  }
});

// GET /api/threads/categories - Get categories (optionally filtered by language)
router.get('/meta/categories', async (req, res) => {
  try {
    const { language } = req.query;
    
    let categories;
    if (language) {
      categories = await db.getCategories(language);
    } else {
      categories = await db.getAllCategories();
    }
    
    res.json(createApiResponse(categories));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json(createErrorResponse('Failed to fetch categories', 500, error.message));
  }
});

export default router;