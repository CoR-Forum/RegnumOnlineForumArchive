# Regnum Forum Archive - Node.js Rewrite

A modern static archive of the Regnum Online Forum. Built with Node.js 22, Express, and featuring a responsive single-page application with AJAX navigation for browsing historical forum content.

## Features

- ✅ **Node.js 22 Backend**: Express.js REST API server with comprehensive read-only endpoints
- ✅ **Single Page Application**: Modern frontend with AJAX navigation and dynamic content loading
- ✅ **Responsive Design**: Mobile-first Bootstrap 5 responsive interface
- ✅ **Read-Only Database**: Optimized SQLite3 integration for historical data access
- ✅ **Security**: Helmet.js, CORS, rate limiting, and input sanitization
- ✅ **Performance**: Compression, caching, and efficient database queries
- ✅ **Docker Support**: Containerized deployment with health checks
- ✅ **Static Archive**: No user accounts, posting, or content modification - pure historical browsing

## Quick Start

1. **Build and run the forum:**
   ```bash
   docker-compose up -d
   ```

2. **Access the forum:**
   Open your browser and navigate to: http://localhost:3000

3. **Stop the forum:**
   ```bash
   docker-compose down
   ```

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```

3. **Run in production mode:**
   ```bash
   npm start
   ```

## API Endpoints

### Threads
- `GET /api/threads` - Get paginated threads with search and filtering
- `GET /api/threads/:id` - Get specific thread details
- `GET /api/threads/:id/posts` - Get paginated posts for a thread

### Users
- `GET /api/users` - Get paginated users with search
- `GET /api/users/:id` - Get specific user profile

### Statistics
- `GET /api/stats` - Get comprehensive forum statistics

## Archive Features

- **Read-Only Access**: Complete historical forum data with no modification capabilities
- **Fast Search**: Full-text search across threads and posts
- **Multi-Language**: Support for Español, English, Português, Deutsch, Français, Italiano
- **Statistics**: Comprehensive forum statistics and user activity data

## File Structure

```
.
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile              # Node.js Alpine container
├── package.json            # Node.js dependencies and scripts
├── src/                    # Backend Node.js application
│   ├── app.js             # Main Express server
│   ├── models/            # Database models and utilities
│   │   └── database.js    # SQLite database layer (read-only)
│   └── routes/            # API route handlers
│       ├── threads.js     # Thread endpoints
│       ├── users.js       # User endpoints
│       └── stats.js       # Statistics endpoints
├── public/                 # Frontend SPA application
│   ├── index.html         # Main HTML entry point
│   ├── css/               # Stylesheets
│   │   └── forum.css      # Custom forum styles
│   └── js/                # JavaScript modules
│       ├── app.js         # Main application controller
│       ├── api.js         # AJAX API client
│       ├── router.js      # SPA routing
│       ├── components/    # UI components
│       └── utils.js       # Utility functions
├── regnumforum.db         # SQLite database (read-only)
└── regnumforum.db         # SQLite database (read-only historical data)
```

## Database

The forum uses an SQLite database (`regnumforum.db`) that contains:
- Thread discussions
- User information
- Posts and messages
- Forum statistics

## Development

To make changes to the forum:
1. Edit files in the `forum/` directory
2. Changes are immediately reflected (no rebuild needed)
3. For PHP configuration changes, rebuild the container:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

## Troubleshooting

- **Forum not loading**: Check if port 8080 is available
- **Database errors**: Ensure `regnumforum.db` has proper permissions
- **PHP errors**: Check logs with `docker-compose logs forum`