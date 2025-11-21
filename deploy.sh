#!/bin/bash

# Flower Inventory App - Quick Deployment Script

echo "🌸 Bloom Manager - Deployment Script"
echo "====================================="
echo ""

# Check if node and npm are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Please create a .env file with your Supabase credentials:"
    echo "1. Copy .env.example to .env"
    echo "2. Add your REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY"
    echo ""
    read -p "Press enter when you've created the .env file..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1. Start development server (localhost)"
echo "2. Build for production"
echo "3. Deploy to Vercel"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting development server..."
        echo ""
        echo "The app will open at http://localhost:3000"
        echo ""
        echo "To access from your phone:"
        echo "1. Make sure your phone and computer are on the same WiFi"
        echo "2. Find your computer's IP address:"
        echo "   - Mac/Linux: ifconfig | grep 'inet '"
        echo "   - Windows: ipconfig"
        echo "3. On your phone, go to: http://YOUR_IP:3000"
        echo ""
        npm start
        ;;
    2)
        echo ""
        echo "🏗️  Building for production..."
        npm run build
        echo ""
        echo "✅ Build complete! Files are in the 'build' folder"
        echo ""
        echo "To deploy:"
        echo "1. Upload the 'build' folder to Netlify (drag & drop)"
        echo "2. Or use 'vercel --prod' to deploy to Vercel"
        ;;
    3)
        if ! command -v vercel &> /dev/null; then
            echo ""
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        echo ""
        echo "🚀 Deploying to Vercel..."
        echo ""
        echo "⚠️  Important: After deployment, add environment variables in Vercel dashboard:"
        echo "   - REACT_APP_SUPABASE_URL"
        echo "   - REACT_APP_SUPABASE_ANON_KEY"
        echo ""
        vercel
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
