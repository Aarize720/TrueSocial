# TrueSocial Backend Setup Script
# This script helps set up the development environment

Write-Host "🚀 TrueSocial Backend Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "📦 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
Write-Host ""
Write-Host "🐘 Checking PostgreSQL installation..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL is installed: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PostgreSQL is not installed or not in PATH" -ForegroundColor Yellow
    Write-Host "Please install PostgreSQL from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Do you want to continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Check if .env file exists
Write-Host ""
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ .env file created" -ForegroundColor Green
    } else {
        Write-Host "❌ .env.example not found. Please create .env manually" -ForegroundColor Red
    }
}

# Install dependencies
Write-Host ""
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Ask if user wants to set up the database
Write-Host ""
Write-Host "🗄️  Database Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
$setupDb = Read-Host "Have you created the PostgreSQL database and user? (y/n)"

if ($setupDb -eq "n") {
    Write-Host ""
    Write-Host "To set up the database, run these commands in psql:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "psql -U postgres -f setup-database.sql" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or manually:" -ForegroundColor Yellow
    Write-Host "1. Open pgAdmin or psql" -ForegroundColor White
    Write-Host "2. Create user: truesocial (password: truesocial123)" -ForegroundColor White
    Write-Host "3. Create database: truesocial (owner: truesocial)" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Press Enter when done, or 'q' to quit"
    if ($continue -eq "q") {
        exit 0
    }
}

# Generate Prisma Client
Write-Host ""
Write-Host "🔨 Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

# Run migrations
Write-Host ""
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
$runMigrations = Read-Host "Do you want to run migrations now? (y/n)"

if ($runMigrations -eq "y") {
    npx prisma migrate dev --name init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations completed successfully" -ForegroundColor Green
        
        # Ask about seeding
        Write-Host ""
        $seedDb = Read-Host "Do you want to seed the database with sample data? (y/n)"
        if ($seedDb -eq "y") {
            Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
            npm run db:seed
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Database seeded successfully" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Seeding failed, but you can try again later with: npm run db:seed" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ Migrations failed" -ForegroundColor Red
        Write-Host "Please check your database connection and try again" -ForegroundColor Yellow
        exit 1
    }
}

# Summary
Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the development server: npm run dev" -ForegroundColor White
Write-Host "2. Open Prisma Studio: npm run prisma:studio" -ForegroundColor White
Write-Host "3. View the API at: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Test credentials (if seeded):" -ForegroundColor Cyan
Write-Host "Email: john.doe@example.com" -ForegroundColor White
Write-Host "Password: password123" -ForegroundColor White
Write-Host ""

$startServer = Read-Host "Do you want to start the development server now? (y/n)"
if ($startServer -eq "y") {
    Write-Host ""
    Write-Host "🚀 Starting development server..." -ForegroundColor Green
    npm run dev
}