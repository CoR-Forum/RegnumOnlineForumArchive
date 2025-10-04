#!/bin/bash

# Development setup script for Regnum Forum Archive

set -e

echo "🚀 Setting up Regnum Forum Archive for development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or later is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Check if database exists
if [ ! -f "regnumforum.db" ]; then
    echo "❌ Database file 'regnumforum.db' not found."
    echo "   Please ensure the SQLite database is present in the project root."
    exit 1
fi

echo "✅ Database file found"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Development environment variables
NODE_ENV=development
PORT=3000
DB_PATH=./regnumforum.db

# Optional: Enable debug logging
DEBUG=forum:*
EOF
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

# Make sure database is readable
chmod 644 regnumforum.db 2>/dev/null || true

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "To start the production server:"
echo "  npm start"
echo ""
echo "To run with Docker:"
echo "  docker-compose up --build"
echo ""
echo "The forum will be available at:"
echo "  - Development: http://localhost:3000"
echo "  - Docker: http://localhost:3000"
echo ""