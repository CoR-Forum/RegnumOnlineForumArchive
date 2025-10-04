# Regnum Online Forum Archive

A static archive of the Champions of Regnum community forum. This application provides a modern web interface for browsing historical forum discussions, posts, and user profiles from the Regnum Online community.

## Features

- **Read-only archive** with search capabilities across threads, posts, and users
- **Multi-language support** for English, Español, Deutsch, Português, Français, and Italiano
- **REST API** for programmatic access to forum data
- **Responsive design** built with Bootstrap 5
- **Docker deployment** ready for production use

## Quick Start

### Requirements
- Docker and Docker Compose
- `regnumforum.db` SQLite database file (contact maintainers for access)

### Installation

```bash
git clone https://github.com/CoR-Forum/RegnumOnlineForumArchive.git
cd RegnumOnlineForumArchive
docker compose up -d --build
```

Open http://localhost:3000 in your browser.

### Development

```bash
npm install
npm run dev  # Development server with hot reload
npm start    # Production server
```

## API Documentation

Base URL: `http://localhost:3000/api`

### Threads

#### List threads
```http
GET /api/threads
```

**Parameters:**
- `language` (string) - Filter by language: "English", "Español", "Deutsch", "Português", "Français", "Italiano"
- `category` (string) - Filter by forum category
- `search` (string) - Search thread titles and content
- `page` (integer) - Page number (default: 1)
- `limit` (integer) - Items per page (default: 20, max: 100)
- `random` (boolean) - Return random threads instead of chronological order

**Response:**
```json
{
  "success": true,
  "data": {
    "threads": [
      {
        "id": 123,
        "name": "Thread Title",
        "language": "English",
        "category": "General Discussion",
        "threadCreator": "Username",
        "threadCreatorId": 456,
        "createdTime": "2023-01-15 14:30:00",
        "lastPoster": "LastUser",
        "lastPosterId": 789,
        "lastPostTime": "2023-01-20 16:45:00",
        "postCount": 25
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 10,
      "totalThreads": 200,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get thread details
```http
GET /api/threads/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "thread": {
      "id": 123,
      "name": "Thread Title",
      "language": "English",
      "category": "General Discussion",
      "threadCreator": "Username",
      "threadCreatorId": 456,
      "createdTime": "2023-01-15 14:30:00",
      "lastPoster": "LastUser",
      "lastPosterId": 789,
      "lastPostTime": "2023-01-20 16:45:00",
      "postCount": 25,
      "path": "/Forum/English/General Discussion/Thread Title"
    }
  }
}
```

#### Get thread posts
```http
GET /api/threads/:id/posts
```

**Parameters:**
- `page` (integer) - Page number (default: 1)
- `limit` (integer) - Posts per page (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 789,
        "threadId": 123,
        "userId": 456,
        "username": "PostAuthor",
        "message": "<p>Post content with HTML formatting</p>",
        "timestamp": "2023-01-15 14:35:00",
        "postNo": 1
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 3,
      "totalPosts": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get thread metadata
```http
GET /api/threads/meta/languages
```

**Response:**
```json
{
  "success": true,
  "data": [
    "English",
    "Español", 
    "Deutsch",
    "Português",
    "Français",
    "Italiano"
  ]
}
```

### Users

#### List users
```http
GET /api/users
```

**Parameters:**
- `search` (string) - Search usernames
- `page` (integer) - Page number (default: 1)
- `limit` (integer) - Users per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 456,
        "name": "Username",
        "postCount": 150,
        "threadCount": 12,
        "firstPost": "2022-05-10 09:15:00",
        "lastPost": "2023-01-20 16:45:00"
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 25,
      "totalUsers": 500,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get user details
```http
GET /api/users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 456,
      "name": "Username",
      "postCount": 150,
      "threadCount": 12,
      "firstPost": "2022-05-10 09:15:00",
      "lastPost": "2023-01-20 16:45:00",
      "joinDate": "2022-05-10 09:15:00"
    }
  }
}
```

#### Get user posts
```http
GET /api/users/:id/posts
```

**Parameters:**
- `page` (integer) - Page number (default: 1)
- `limit` (integer) - Posts per page (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 789,
        "threadId": 123,
        "threadName": "Thread Title",
        "message": "<p>Post content</p>",
        "timestamp": "2023-01-15 14:35:00",
        "postNo": 1
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 8,
      "totalPosts": 150,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get user threads
```http
GET /api/users/:id/threads
```

**Parameters:**
- `page` (integer) - Page number (default: 1)
- `limit` (integer) - Threads per page (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "threads": [
      {
        "id": 123,
        "name": "Thread Title",
        "language": "English",
        "category": "General Discussion",
        "createdTime": "2023-01-15 14:30:00",
        "postCount": 25
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 1,
      "totalThreads": 12,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### Statistics

#### Get overview statistics
```http
GET /api/stats/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1500,
    "totalThreads": 850,
    "totalPosts": 12000,
    "totalLanguages": 6
  }
}
```

#### Get comprehensive statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1500,
      "totalThreads": 850,
      "totalPosts": 12000,
      "totalLanguages": 6
    },
    "languages": [
      {
        "language": "English",
        "flag": "🇺🇸",
        "thread_count": 450,
        "post_count": 8000,
        "percentage": 66.67
      }
    ],
    "mostActiveUsers": [
      {
        "id": 456,
        "name": "Username",
        "post_count": 150,
        "rank": 1,
        "medal": "🥇"
      }
    ],
    "yearlyActivity": [
      {
        "year": 2023,
        "post_count": 2500,
        "percentage": 85.5
      }
    ],
    "topCategories": [
      {
        "category": "General Discussion",
        "full_category": "Forum/English/General Discussion",
        "display_category": "Forum › English › General Discussion",
        "post_count": 3000,
        "rank": 1,
        "percentage": 100.0
      }
    ]
  }
}
```

#### Get language statistics
```http
GET /api/stats/languages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "language": "English",
      "flag": "🇺🇸",
      "thread_count": 450,
      "post_count": 8000,
      "percentage": 66.67
    }
  ]
}
```

#### Get user activity statistics
```http
GET /api/stats/users?limit=10
```

#### Get yearly activity statistics
```http
GET /api/stats/activity
```

#### Get category statistics
```http
GET /api/stats/categories?limit=10
```

#### Get categories
```http
GET /api/threads/meta/categories?language=English
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "General Discussion",
      "thread_count": 120,
      "post_count": 3000
    },
    {
      "category": "Suggestions & Ideas",
      "thread_count": 85,
      "post_count": 1200
    }
  ]
}
```

### System

#### Health check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2023-01-15T14:30:00.000Z",
  "uptime": 3600.5,
  "database": "connected"
}
```

### Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

HTTP status codes: 200 (success), 400 (bad request), 404 (not found), 429 (rate limited), 500 (server error)

## Project Structure

```
├── src/                    # Backend API
│   ├── app.js             # Express server
│   ├── middleware/        # Custom middleware (empty)
│   ├── models/database.js # SQLite database layer
│   ├── routes/            # API endpoints (threads, users, stats)
│   └── utils/helpers.js   # Server utilities
├── public/                # Frontend SPA
│   ├── index.html         # Main HTML
│   ├── assets/            # Static assets (logos)
│   ├── css/forum.css      # Stylesheets
│   └── js/                # JavaScript modules (app, api, router, components, utils)
├── regnumforum.db         # SQLite database
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Node.js container
└── package.json           # Node.js dependencies
```

## Database Requirements

The application requires a SQLite database file named `regnumforum.db` containing the forum archive data. This file must be present in the root directory for the application to function.

**Database Schema:**
- `threads` - Forum thread discussions
- `posts` - Individual post messages  
- `users` - User profiles and statistics
- Additional metadata tables for categories and languages

## Environment Variables

- `NODE_ENV` - Runtime environment (production/development)
- `PORT` - Server port (default: 3000)
- `DB_PATH` - SQLite database path (default: ./regnumforum.db)

## Future Development

We are planning to expand the archive by scraping additional historical forum data from archive.org (Wayback Machine) to preserve even more community discussions that may not be in the current database.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)  
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Links

- **GitHub Repository**: [RegnumOnlineForumArchive](https://github.com/CoR-Forum/RegnumOnlineForumArchive)
- **Community Forum**: [CoR Forum](https://cor-forum.de)

## About

This archive preserves the historical discussions from the Champions of Regnum gaming community. Regnum Online is a medieval fantasy MMORPG that has fostered a dedicated international community for many years. This project ensures that valuable community discussions, guides, and memories remain accessible to current and future players.