import express from 'express';
import db from '../models/database.js';
import { createApiResponse, createErrorResponse, getLanguageFlag } from '../utils/helpers.js';

const router = express.Router();

// GET /api/stats - Get comprehensive forum statistics
router.get('/', async (req, res) => {
  try {
    // Get basic forum statistics
    const forumStats = await db.getForumStats();
    
    // Get language breakdown
    const languageStats = await db.getLanguageStats();
    
    // Get most active users
    const mostActiveUsers = await db.getMostActiveUsers(20);
    
    // Get posting activity by year
    const yearlyStats = await db.getYearlyStats();
    
    // Get top categories
    const topCategories = await db.getTopCategories(10);
    
    // Format language stats with flags
    const formattedLanguageStats = languageStats
      .filter(lang => lang.language !== 'Other')
      .map(lang => ({
        ...lang,
        flag: getLanguageFlag(lang.language),
        percentage: forumStats.total_posts > 0 
          ? Math.round((lang.post_count / forumStats.total_posts) * 100 * 100) / 100 
          : 0
      }));
    
    // Calculate totals and percentages for categories
    const maxCategoryPosts = topCategories.length > 0 
      ? Math.max(...topCategories.map(cat => cat.post_count)) 
      : 0;
    
    const formattedCategories = topCategories.map((cat, index) => ({
      ...cat,
      rank: index + 1,
      percentage: maxCategoryPosts > 0 
        ? Math.round((cat.post_count / maxCategoryPosts) * 100 * 100) / 100 
        : 0,
      display_category: cat.full_category.replace(/\//g, ' › ')
    }));
    
    // Calculate yearly activity percentages
    const maxYearlyPosts = yearlyStats.length > 0 
      ? Math.max(...yearlyStats.map(year => year.post_count)) 
      : 0;
    
    const formattedYearlyStats = yearlyStats.map(year => ({
      ...year,
      percentage: maxYearlyPosts > 0 
        ? Math.round((year.post_count / maxYearlyPosts) * 100 * 100) / 100 
        : 0
    }));
    
    // Add ranks to most active users
    const formattedUsers = mostActiveUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
      medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));
    
    const statsData = {
      overview: {
        totalUsers: forumStats.total_users,
        totalThreads: forumStats.total_threads,
        totalPosts: forumStats.total_posts,
        totalLanguages: formattedLanguageStats.length
      },
      languages: formattedLanguageStats,
      mostActiveUsers: formattedUsers,
      yearlyActivity: formattedYearlyStats,
      topCategories: formattedCategories,
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: 'regnumforum.db'
      }
    };
    
    res.json(createApiResponse(statsData));
    
  } catch (error) {
    console.error('Error fetching forum statistics:', error);
    res.status(500).json(createErrorResponse('Failed to fetch forum statistics', 500, error.message));
  }
});

// GET /api/stats/overview - Get basic overview statistics
router.get('/overview', async (req, res) => {
  try {
    const stats = await db.getForumStats();
    const languageCount = (await db.getLanguageStats()).filter(lang => lang.language !== 'Other').length;
    
    res.json(createApiResponse({
      totalUsers: stats.total_users,
      totalThreads: stats.total_threads,
      totalPosts: stats.total_posts,
      totalLanguages: languageCount
    }));
    
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json(createErrorResponse('Failed to fetch overview statistics', 500, error.message));
  }
});

// GET /api/stats/languages - Get language-specific statistics
router.get('/languages', async (req, res) => {
  try {
    const languageStats = await db.getLanguageStats();
    const forumStats = await db.getForumStats();
    
    const formattedStats = languageStats
      .filter(lang => lang.language !== 'Other')
      .map(lang => ({
        ...lang,
        flag: getLanguageFlag(lang.language),
        percentage: forumStats.total_posts > 0 
          ? Math.round((lang.post_count / forumStats.total_posts) * 100 * 100) / 100 
          : 0
      }))
      .sort((a, b) => b.post_count - a.post_count);
    
    res.json(createApiResponse(formattedStats));
    
  } catch (error) {
    console.error('Error fetching language stats:', error);
    res.status(500).json(createErrorResponse('Failed to fetch language statistics', 500, error.message));
  }
});

// GET /api/stats/users - Get user activity statistics
router.get('/users', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    
    const mostActiveUsers = await db.getMostActiveUsers(validatedLimit);
    
    const formattedUsers = mostActiveUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
      medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));
    
    res.json(createApiResponse(formattedUsers));
    
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json(createErrorResponse('Failed to fetch user statistics', 500, error.message));
  }
});

// GET /api/stats/activity - Get temporal activity statistics
router.get('/activity', async (req, res) => {
  try {
    const yearlyStats = await db.getYearlyStats();
    
    const maxYearlyPosts = yearlyStats.length > 0 
      ? Math.max(...yearlyStats.map(year => year.post_count)) 
      : 0;
    
    const formattedStats = yearlyStats.map(year => ({
      ...year,
      percentage: maxYearlyPosts > 0 
        ? Math.round((year.post_count / maxYearlyPosts) * 100 * 100) / 100 
        : 0
    }));
    
    // Calculate some additional insights
    const totalActivityPosts = yearlyStats.reduce((sum, year) => sum + year.post_count, 0);
    const peakYear = yearlyStats.reduce((peak, year) => 
      year.post_count > peak.post_count ? year : peak, { year: 'N/A', post_count: 0 });
    
    res.json(createApiResponse({
      yearlyActivity: formattedStats,
      insights: {
        totalYears: yearlyStats.length,
        totalPosts: totalActivityPosts,
        peakYear: peakYear.year,
        peakYearPosts: peakYear.post_count,
        averagePostsPerYear: yearlyStats.length > 0 
          ? Math.round(totalActivityPosts / yearlyStats.length) 
          : 0
      }
    }));
    
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json(createErrorResponse('Failed to fetch activity statistics', 500, error.message));
  }
});

// GET /api/stats/categories - Get category statistics
router.get('/categories', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const validatedLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));
    
    const topCategories = await db.getTopCategories(validatedLimit);
    
    const maxCategoryPosts = topCategories.length > 0 
      ? Math.max(...topCategories.map(cat => cat.post_count)) 
      : 0;
    
    const formattedCategories = topCategories.map((cat, index) => ({
      ...cat,
      rank: index + 1,
      percentage: maxCategoryPosts > 0 
        ? Math.round((cat.post_count / maxCategoryPosts) * 100 * 100) / 100 
        : 0,
      display_category: cat.full_category.replace(/\//g, ' › ')
    }));
    
    res.json(createApiResponse(formattedCategories));
    
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json(createErrorResponse('Failed to fetch category statistics', 500, error.message));
  }
});

export default router;