#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/your-org/agentforge.git"
DIR="agentforge"

echo "========================================"
echo "  AgentForge — Quick Install"
echo "========================================"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required (node --version)"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required"; exit 1; }
command -v docker >/dev/null 2>&1 || echo "Warning: Docker not found — you'll need PostgreSQL/Redis separately"

# Clone
if [ ! -d "$DIR" ]; then
  echo "[1/7] Cloning repository..."
  git clone "$REPO" "$DIR"
fi
cd "$DIR"

# .env
echo "[2/7] Configuring environment..."
cp -n .env.example backend/.env 2>/dev/null || true

# Docker
echo "[3/7] Starting infrastructure..."
docker compose up -d 2>/dev/null || echo "Skipping Docker (not available)"

# Backend install
echo "[4/7] Installing backend dependencies..."
cd backend
npm install

# Database setup
echo "[5/7] Setting up database..."
echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if node -e "const{Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL||'postgresql://postgres:password@localhost:5433/agentforge'});c.connect().then(()=>{console.log('db ok');process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; then
    break
  fi
  sleep 2
done
node create_settings_table.mjs 2>/dev/null || echo "DB setup skipped (will run on first start)"

# Build backend
echo "[6/7] Building backend..."
npm run build

# Frontend install
echo "[7/7] Installing frontend dependencies..."
cd ../frontend
npm install

cd ..

echo ""
echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
echo "Start the servers:"
echo "  cd backend && node dist/src/main.js &"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000"
echo "Login: admin / admin123"
echo ""
