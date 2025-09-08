#!/bin/bash

# Fivetran Slack Bot Setup Script
# This script helps you set up the project quickly

set -e

echo "🚀 Fivetran Slack Bot Setup"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env with your actual credentials"
else
    echo "✅ .env file already exists"
fi

# Run validation
echo "🔍 Running configuration validation..."
if npm run validate > /dev/null 2>&1; then
    echo "✅ Configuration is valid"
else
    echo "⚠️  Configuration validation failed - this is expected before adding credentials"
fi

# Run tests
echo "🧪 Running tests..."
if npm test > /dev/null 2>&1; then
    echo "✅ All tests passed"
else
    echo "⚠️  Some tests failed - this may be expected without real credentials"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Slack and Fivetran credentials"
echo "2. Create a Slack app (see SETUP.md for instructions)"
echo "3. Run: npm run validate"
echo "4. Run: npm start"
echo "5. Use ngrok for local development: ngrok http 3000"
echo ""
echo "📚 For detailed instructions, see SETUP.md"
