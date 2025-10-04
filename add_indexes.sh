#!/bin/bash

# Script to add critical indexes to the existing SQLite database
# This will dramatically improve query performance

DB_PATH="./regnumforum.db"

echo "Adding critical performance indexes to $DB_PATH..."

# Create the indexes
sqlite3 "$DB_PATH" << 'EOF'
-- Posts table indexes (MOST CRITICAL)
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_posts_thread_timestamp ON posts(thread_id, timestamp DESC);

-- Threads table indexes
CREATE INDEX IF NOT EXISTS idx_threads_path ON threads(path);

-- Users table indexes  
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_posts_user_thread ON posts(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_thread_postno ON posts(thread_id, post_no);

-- NEW: Advanced indexes for user profiles and performance
CREATE INDEX IF NOT EXISTS idx_posts_user_timestamp ON posts(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_postno ON posts(user_id, post_no DESC);
CREATE INDEX IF NOT EXISTS idx_threads_id_name ON threads(id, name);
CREATE INDEX IF NOT EXISTS idx_threads_id_path ON threads(id, path);
CREATE INDEX IF NOT EXISTS idx_users_id_name ON users(id, name);

-- Covering indexes for fastest lookups
# Advanced covering indexes for ultra-fast user queries
echo "Adding covering indexes..."
sqlite3 "$DB_FILE" "CREATE INDEX IF NOT EXISTS idx_posts_user_covering ON posts (user_id, timestamp DESC, id, thread_id, message);"
sqlite3 "$DB_FILE" "CREATE INDEX IF NOT EXISTS idx_posts_thread_covering ON posts (thread_id, user_id, timestamp, id, message);"

# Additional specialized indexes for edge cases
echo "Adding specialized indexes..."
sqlite3 "$DB_FILE" "CREATE INDEX IF NOT EXISTS idx_posts_timestamp_desc ON posts (timestamp DESC);"
sqlite3 "$DB_FILE" "CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users (LOWER(name));"

echo "All indexes added successfully!"
sqlite3 regnumforum.db ".indexes" | wc -l
echo " indexes created total."

-- Analyze tables for better query planning
ANALYZE;

-- Show the created indexes
.headers on
SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL;
EOF

echo "✅ Performance indexes added successfully!"
echo "Your database should now be MUCH faster."
echo ""
echo "Index summary:"
echo "- Posts by thread_id (for thread views)"  
echo "- Posts by user_id (for user profiles)"
echo "- Posts by timestamp (for recent activity)"
echo "- Threads by path (for language/category filtering)"
echo "- Users by name (for user searches)"
echo "- Composite indexes for complex queries"