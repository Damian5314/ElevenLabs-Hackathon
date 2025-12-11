#!/bin/bash

# LifeAdmin Voice Agent - Startup Script
# ======================================
# This script starts all services needed for the demo

echo "=================================================="
echo "  LifeAdmin Voice Agent - Startup"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Warning: backend/.env not found${NC}"
    echo "Creating from .env.example..."
    cp backend/.env.example backend/.env
    echo -e "${RED}Please edit backend/.env with your API keys!${NC}"
    echo ""
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Install dependencies if needed
echo "Checking dependencies..."
echo ""

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "=================================================="
echo "  Starting Services"
echo "=================================================="
echo ""

# Start Backend
echo -e "${GREEN}Starting Backend on port 3001...${NC}"
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start Frontend
echo -e "${GREEN}Starting Frontend on port 3000...${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=================================================="
echo "  Services Started!"
echo "=================================================="
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  Health:    http://localhost:3001/api/health"
echo ""
echo "  Dummy Sites (served by backend):"
echo "  - Tandarts: http://localhost:3001/tandarts.html"
echo "  - Event:    http://localhost:3001/event.html"
echo ""
echo "=================================================="
echo "  n8n Setup (optional, for recurring tasks)"
echo "=================================================="
echo ""
echo "  1. Start n8n:  npx n8n"
echo "  2. Open:       http://localhost:5678"
echo "  3. Import:     n8n/workflows/lifeadmin-check-workflows.json"
echo "  4. Activate the workflow"
echo ""
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
wait
