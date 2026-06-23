#!/bin/bash
# RMET Sales Analytics - Complete Installation Commands
# Run this script to set up the entire project

echo "=== RMET Sales Analytics Installation ==="
echo ""

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current version: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Install Firebase CLI globally if not installed
echo ""
echo "Checking Firebase CLI..."
if ! command -v firebase &> /dev/null; then
  echo "📦 Installing Firebase CLI..."
  npm install -g firebase-tools
else
  echo "✅ Firebase CLI already installed"
fi

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install functions dependencies
echo ""
echo "📦 Installing Firebase Functions dependencies..."
cd functions
npm install
cd ..

# Install frontend dependencies
echo ""
echo "📦 Installing Frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "1. Create .env.local in functions/ with your API keys"
echo "2. Create .env in frontend/ with Firebase config"
echo "3. Run 'firebase login' to authenticate"
echo "4. Run 'firebase use --add' to set your project"
echo "5. Run 'npm run deploy' to deploy everything"
echo ""
echo "For local development:"
echo "  - Backend: npm run dev:functions"
echo "  - Frontend: npm run dev:frontend"
echo "  - Tests: npm run test:all"
