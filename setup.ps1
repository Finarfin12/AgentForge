param(
  [string]$Repo = "https://github.com/your-org/agentforge.git",
  [string]$Dir = "agentforge"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AgentForge — Quick Install" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
try { node --version | Out-Null } catch { Write-Host "Error: Node.js is required" -ForegroundColor Red; exit 1 }
try { npm --version | Out-Null } catch { Write-Host "Error: npm is required" -ForegroundColor Red; exit 1 }
try { docker --version | Out-Null } catch { Write-Host "Warning: Docker not found" -ForegroundColor Yellow }

# Clone
if (-not (Test-Path $Dir)) {
  Write-Host "[1/7] Cloning repository..."
  git clone $Repo $Dir
}
Set-Location $Dir

# .env
Write-Host "[2/7] Configuring environment..."
if (-not (Test-Path "backend\.env")) { Copy-Item ".env.example" "backend\.env" }

# Docker
Write-Host "[3/7] Starting infrastructure..."
try { docker compose up -d } catch { Write-Host "Skipping Docker" -ForegroundColor Yellow }

# Backend install
Write-Host "[4/7] Installing backend dependencies..."
Set-Location backend
npm install

# Database setup
Write-Host "[5/7] Setting up database..."
Write-Host "Waiting for PostgreSQL..." -ForegroundColor Yellow
Start-Sleep 10
try { node create_settings_table.mjs } catch { Write-Host "DB setup skipped" -ForegroundColor Yellow }

# Build
Write-Host "[6/7] Building backend..."
npm run build

# Frontend
Write-Host "[7/7] Installing frontend dependencies..."
Set-Location ../frontend
npm install

Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Start the servers:"
Write-Host "  cd backend; node dist/src/main.js"
Write-Host "  cd frontend; npm run dev"
Write-Host ""
Write-Host "Then open http://localhost:3000"
Write-Host "Login: admin / admin123"
Write-Host ""
