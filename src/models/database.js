import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Enable verbose mode for debugging
sqlite3.verbose();

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || '/var/lib/sqlite/regnumforum.db';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('Database connection failed:', err.message);
          reject(err);
          return;
        }
        
        console.log('📚 Connected to SQLite database');
        
        // Optimize database for read-only operations
        this.db.serialize(() => {
          this.db.run('PRAGMA query_only=ON');
          this.db.run('PRAGMA cache_size=50000');
          this.db.run('PRAGMA temp_store=MEMORY');
          this.db.run('PRAGMA mmap_size=268435456'); // 256MB
          this.db.run('PRAGMA read_uncommitted=ON');
          this.db.run('PRAGMA synchronous=OFF');
        });
        
        resolve();
      });
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('📚 Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Promisify database methods
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Get all supported languages
  async getLanguages() {
    const sql = `
      SELECT DISTINCT 
        CASE 
          WHEN path LIKE '%/Español/%' THEN 'Español'
          WHEN path LIKE '%/English/%' THEN 'English'
          WHEN path LIKE '%/Português/%' THEN 'Português'
          WHEN path LIKE '%/Deutsch/%' THEN 'Deutsch'
          WHEN path LIKE '%/Français/%' THEN 'Français'
          WHEN path LIKE '%/Italiano/%' THEN 'Italiano'
          ELSE 'Other'
        END as language
      FROM threads 
      WHERE language != 'Other'
      ORDER BY language
    `;
    
    return this.all(sql);
  }

  // Get categories for a specific language
  async getCategories(language = null) {
    const sql = `
      SELECT DISTINCT 
        SUBSTR(path, LENGTH('Calendar/Champions of Regnum/') + LENGTH(?) + 2) as category,
        COUNT(*) as thread_count
      FROM threads 
      WHERE path LIKE ?
      GROUP BY category
      ORDER BY category
    `;
    
    const languagePattern = language ? language : '%';
    const pathPattern = `Calendar/Champions of Regnum/${languagePattern}/%`;
    
    return this.all(sql, [language || '', pathPattern]);
  }

  // Get all categories for overview
  async getAllCategories() {
    const sql = `
      SELECT DISTINCT 
        CASE 
          WHEN path LIKE '%/Español/%' THEN 'Español'
          WHEN path LIKE '%/English/%' THEN 'English'
          WHEN path LIKE '%/Português/%' THEN 'Português'
          WHEN path LIKE '%/Deutsch/%' THEN 'Deutsch'
          WHEN path LIKE '%/Français/%' THEN 'Français'
          WHEN path LIKE '%/Italiano/%' THEN 'Italiano'
          ELSE 'Other'
        END as language,
        SUBSTR(path, LENGTH('Calendar/Champions of Regnum/') + LENGTH(
          CASE 
            WHEN path LIKE '%/Español/%' THEN 'Español'
            WHEN path LIKE '%/English/%' THEN 'English'
            WHEN path LIKE '%/Português/%' THEN 'Português'
            WHEN path LIKE '%/Deutsch/%' THEN 'Deutsch'
            WHEN path LIKE '%/Français/%' THEN 'Français'
            WHEN path LIKE '%/Italiano/%' THEN 'Italiano'
            ELSE 'Other'
          END
        ) + 2) as category,
        COUNT(*) as thread_count,
        COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as post_count
      FROM threads t
      LEFT JOIN posts p ON t.id = p.thread_id
      WHERE language != 'Other'
      GROUP BY language, category
      ORDER BY language, thread_count DESC
    `;
    
    return this.all(sql);
  }

  // Get threads with pagination and filtering
  async getThreads(language = null, category = null, limit = 50, offset = 0) {
    let sql = `
      SELECT 
        t.id, 
        t.name, 
        t.path,
        (SELECT COUNT(*) FROM posts WHERE thread_id = t.id) as post_count,
        (SELECT u.name FROM posts p JOIN users u ON p.user_id = u.id 
         WHERE p.thread_id = t.id ORDER BY p.timestamp DESC LIMIT 1) as last_poster,
        (SELECT MAX(timestamp) FROM posts WHERE thread_id = t.id) as last_post_time,
        (SELECT MIN(timestamp) FROM posts WHERE thread_id = t.id) as created_time,
        (SELECT u.name FROM posts p JOIN users u ON p.user_id = u.id 
         WHERE p.thread_id = t.id ORDER BY p.post_no ASC LIMIT 1) as thread_creator
      FROM threads t
      WHERE 1=1
    `;
    
    const params = [];
    
    if (language) {
      sql += ' AND t.path LIKE ?';
      params.push(`%/${language}/%`);
    }
    
    if (category) {
      sql += ' AND t.path LIKE ?';
      params.push(`%/${category}`);
    }
    
    sql += ' ORDER BY last_post_time DESC NULLS LAST LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return this.all(sql, params);
  }

  // Get a single thread
  async getThread(threadId) {
    const sql = 'SELECT * FROM threads WHERE id = ?';
    return this.get(sql, [threadId]);
  }

  // Get posts for a thread with pagination
  async getPosts(threadId, limit = 20, offset = 0) {
    const sql = `
      SELECT p.*, u.name as username
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.thread_id = ?
      ORDER BY p.post_no ASC
      LIMIT ? OFFSET ?
    `;
    
    return this.all(sql, [threadId, limit, offset]);
  }

  // Get post count for a thread
  async getPostCount(threadId) {
    const sql = 'SELECT COUNT(*) as count FROM posts WHERE thread_id = ?';
    const result = await this.get(sql, [threadId]);
    return result ? result.count : 0;
  }

  // Search threads
  async searchThreads(query, language = null) {
    let sql = `
      SELECT DISTINCT t.id, t.name, t.path,
        COUNT(p.id) as post_count,
        MAX(p.timestamp) as last_post_time,
        MIN(p.timestamp) as created_time,
        u.name as last_poster,
        u2.name as thread_creator
      FROM threads t
      LEFT JOIN posts p ON t.id = p.thread_id
      LEFT JOIN users u ON p.user_id = u.id AND p.timestamp = (SELECT MAX(timestamp) FROM posts WHERE thread_id = t.id)
      LEFT JOIN users u2 ON u2.id = (SELECT user_id FROM posts WHERE thread_id = t.id ORDER BY timestamp ASC LIMIT 1)
      WHERE (t.name LIKE ? OR EXISTS (
        SELECT 1 FROM posts p2 WHERE p2.thread_id = t.id AND p2.message LIKE ?
      ))
    `;
    
    const params = [`%${query}%`, `%${query}%`];
    
    if (language) {
      sql += ' AND t.path LIKE ?';
      params.push(`%/${language}/%`);
    }
    
    sql += ` 
      GROUP BY t.id, t.name, t.path
      ORDER BY MAX(p.timestamp) DESC
      LIMIT 50
    `;
    
    return this.all(sql, params);
  }

  // Get user list with pagination and search
  async getUserList(limit = 50, offset = 0, search = null) {
    let sql = `
      SELECT u.id, u.name,
        COUNT(DISTINCT p.thread_id) as thread_count,
        COUNT(p.id) as post_count,
        MIN(p.timestamp) as first_post,
        MAX(p.timestamp) as last_post
      FROM users u
      INNER JOIN posts p ON u.id = p.user_id
      WHERE u.name IS NOT NULL AND u.name != '' AND u.id > 0
    `;
    
    const params = [];
    
    if (search) {
      sql += ' AND u.name LIKE ?';
      params.push(`%${search}%`);
    }
    
    sql += ` 
      GROUP BY u.id, u.name
      ORDER BY post_count DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    return this.all(sql, params);
  }

  // Get user count for pagination
  async getUserCount(search = null) {
    let sql = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN posts p ON u.id = p.user_id
      WHERE u.name IS NOT NULL AND u.name != '' AND u.id > 0
    `;
    
    const params = [];
    
    if (search) {
      sql += ' AND u.name LIKE ?';
      params.push(`%${search}%`);
    }
    
    const result = await this.get(sql, params);
    return result ? result.count : 0;
  }

  // Get user with statistics
  async getUserWithStats(userId) {
    // First get user info
    const userSql = 'SELECT id, name FROM users WHERE id = ?';
    const user = await this.get(userSql, [userId]);
    
    if (!user) {
      return null;
    }
    
    // Then get stats
    const statsSql = `
      SELECT 
        COUNT(*) as total_posts,
        COUNT(DISTINCT thread_id) as total_threads,
        MIN(timestamp) as first_post,
        MAX(timestamp) as last_post
      FROM posts 
      WHERE user_id = ?
    `;
    
    const stats = await this.get(statsSql, [userId]);
    
    return { ...user, ...stats };
  }

  // Get user threads
  async getUserThreads(userId, limit = 20, offset = 0) {
    const sql = `
      SELECT 
        t.id, 
        t.name, 
        t.path,
        tc.post_count,
        up.first_post,
        tc.last_post
      FROM (
        SELECT thread_id, MIN(timestamp) as first_post
        FROM posts 
        WHERE user_id = ?
        GROUP BY thread_id
        ORDER BY first_post DESC
        LIMIT ? OFFSET ?
      ) up
      INNER JOIN threads t ON up.thread_id = t.id
      INNER JOIN (
        SELECT thread_id, COUNT(*) as post_count, MAX(timestamp) as last_post
        FROM posts 
        GROUP BY thread_id
      ) tc ON t.id = tc.thread_id
      ORDER BY up.first_post DESC
    `;
    
    return this.all(sql, [userId, limit, offset]);
  }

  // Get user posts
  async getUserPosts(userId, limit = 20, offset = 0) {
    const sql = `
      SELECT 
        p.id,
        p.thread_id,
        p.post_no,
        p.timestamp,
        p.message,
        t.name as thread_name, 
        t.path as thread_path
      FROM posts p
      INNER JOIN threads t ON p.thread_id = t.id
      WHERE p.user_id = ?
      ORDER BY p.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    return this.all(sql, [userId, limit, offset]);
  }

  // Get forum statistics
  async getForumStats() {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE id > 0) as total_users,
        (SELECT COUNT(*) FROM threads) as total_threads,
        (SELECT COUNT(*) FROM posts) as total_posts,
        6 as total_languages
    `;
    
    return this.get(statsQuery);
  }

  // Get language statistics
  async getLanguageStats() {
    const sql = `
      SELECT 
        CASE 
          WHEN path LIKE '%/Español/%' THEN 'Español'
          WHEN path LIKE '%/English/%' THEN 'English'
          WHEN path LIKE '%/Português/%' THEN 'Português'
          WHEN path LIKE '%/Deutsch/%' THEN 'Deutsch'
          WHEN path LIKE '%/Français/%' THEN 'Français'
          WHEN path LIKE '%/Italiano/%' THEN 'Italiano'
          ELSE 'Other'
        END as language,
        COUNT(t.id) as thread_count,
        (SELECT COUNT(*) FROM posts WHERE thread_id IN (
          SELECT id FROM threads t2 WHERE 
          CASE 
            WHEN t2.path LIKE '%/Español/%' THEN 'Español'
            WHEN t2.path LIKE '%/English/%' THEN 'English'
            WHEN t2.path LIKE '%/Português/%' THEN 'Português'
            WHEN t2.path LIKE '%/Deutsch/%' THEN 'Deutsch'
            WHEN t2.path LIKE '%/Français/%' THEN 'Français'
            WHEN t2.path LIKE '%/Italiano/%' THEN 'Italiano'
            ELSE 'Other'
          END = language
        )) as post_count
      FROM threads t
      GROUP BY language
      ORDER BY post_count DESC
    `;
    
    return this.all(sql);
  }

  // Get most active users
  async getMostActiveUsers(limit = 20) {
    const sql = `
      SELECT 
        u.name,
        COUNT(p.id) as post_count
      FROM users u
      JOIN posts p ON u.id = p.user_id
      WHERE u.name IS NOT NULL AND u.name != ''
      GROUP BY u.id, u.name
      ORDER BY post_count DESC
      LIMIT ?
    `;
    
    return this.all(sql, [limit]);
  }

  // Get posting activity by year
  async getYearlyStats() {
    const sql = `
      SELECT 
        CASE 
          WHEN timestamp LIKE '%-%-%' AND LENGTH(timestamp) >= 10 THEN
            SUBSTR(timestamp, -4)
          ELSE 'Unknown'
        END as year,
        COUNT(*) as post_count
      FROM posts
      WHERE year != 'Unknown' AND year BETWEEN '2005' AND '2025'
      GROUP BY year
      ORDER BY year
    `;
    
    return this.all(sql);
  }

  // Get top categories
  async getTopCategories(limit = 10) {
    const sql = `
      SELECT 
        SUBSTR(path, LENGTH('Calendar/Champions of Regnum/') + 1) as full_category,
        COUNT(t.id) as thread_count,
        (SELECT COUNT(*) FROM posts WHERE thread_id IN (
          SELECT id FROM threads WHERE path LIKE t.path || '%'
        )) as post_count
      FROM threads t
      GROUP BY full_category
      ORDER BY post_count DESC
      LIMIT ?
    `;
    
    return this.all(sql, [limit]);
  }
}

// Create singleton instance
const db = new Database();

// Initialize database connection
db.connect().catch(console.error);

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connection...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connection...');
  await db.close();
  process.exit(0);
});

export default db;