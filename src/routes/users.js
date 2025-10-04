import express from 'express';
import db from '../models/database.js';
import { 
  createApiResponse, 
  createErrorResponse, 
  validatePagination,
  formatUserForApi,
  formatPostForApi,
  formatThreadForApi
} from '../utils/helpers.js';

const router = express.Router();

// GET /api/users - Get users with pagination and search
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const pagination = validatePagination(page, limit);
    
    const users = await db.getUserList(pagination.limit, pagination.offset, search);
    const totalUsers = await db.getUserCount(search);
    
    const formattedUsers = users.map(formatUserForApi);
    
    res.json(createApiResponse({
      users: formattedUsers,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(totalUsers / pagination.limit),
        totalUsers,
        hasNext: pagination.offset + users.length < totalUsers,
        hasPrev: pagination.page > 1,
        startItem: pagination.offset + 1,
        endItem: Math.min(pagination.offset + pagination.limit, totalUsers)
      },
      search
    }));
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json(createErrorResponse('Failed to fetch users', 500, error.message));
  }
});

// GET /api/users/:id - Get specific user profile with statistics
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!userId || userId < 1) {
      return res.status(400).json(createErrorResponse('Invalid user ID', 400));
    }
    
    const user = await db.getUserWithStats(userId);
    
    if (!user) {
      return res.status(404).json(createErrorResponse('User not found', 404));
    }
    
    const formattedUser = formatUserForApi(user);
    
    res.json(createApiResponse(formattedUser));
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json(createErrorResponse('Failed to fetch user', 500, error.message));
  }
});

// GET /api/users/:id/posts - Get posts by a specific user
router.get('/:id/posts', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { page = 1, limit = 20 } = req.query;
    
    if (!userId || userId < 1) {
      return res.status(400).json(createErrorResponse('Invalid user ID', 400));
    }
    
    const pagination = validatePagination(page, limit);
    
    // Check if user exists
    const user = await db.getUserWithStats(userId);
    if (!user) {
      return res.status(404).json(createErrorResponse('User not found', 404));
    }
    
    // Get user posts
    const posts = await db.getUserPosts(userId, pagination.limit, pagination.offset);
    const totalPosts = user.total_posts || 0;
    
    const formattedPosts = posts.map(formatPostForApi);
    
    res.json(createApiResponse({
      posts: formattedPosts,
      user: formatUserForApi(user),
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
    console.error('Error fetching user posts:', error);
    res.status(500).json(createErrorResponse('Failed to fetch user posts', 500, error.message));
  }
});

// GET /api/users/:id/threads - Get threads started by a specific user
router.get('/:id/threads', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { page = 1, limit = 20 } = req.query;
    
    if (!userId || userId < 1) {
      return res.status(400).json(createErrorResponse('Invalid user ID', 400));
    }
    
    const pagination = validatePagination(page, limit);
    
    // Check if user exists
    const user = await db.getUserWithStats(userId);
    if (!user) {
      return res.status(404).json(createErrorResponse('User not found', 404));
    }
    
    // Get user threads
    const threads = await db.getUserThreads(userId, pagination.limit, pagination.offset);
    const totalThreads = user.total_threads || 0;
    
    const formattedThreads = threads.map(formatThreadForApi);
    
    res.json(createApiResponse({
      threads: formattedThreads,
      user: formatUserForApi(user),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(totalThreads / pagination.limit),
        totalThreads,
        hasMore: pagination.offset + threads.length < totalThreads,
        hasPrev: pagination.page > 1
      }
    }));
    
  } catch (error) {
    console.error('Error fetching user threads:', error);
    res.status(500).json(createErrorResponse('Failed to fetch user threads', 500, error.message));
  }
});

export default router;