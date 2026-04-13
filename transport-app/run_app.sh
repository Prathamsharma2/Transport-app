#!/bin/bash
# Kill existing Electron processes
pkill -f electron || true

# Start Electron from the root directory
echo "🚀 Starting Transport System App (Supabase Cloud Mode)..."
npm start
