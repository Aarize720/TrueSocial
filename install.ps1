# Script d'installation automatique pour TrueSocial
# Exécuter avec : powershell -ExecutionPolicy Bypass -File install.ps1

Write-Host "🚀 Installation de TrueSocial..." -ForegroundColor Green
Write-Host ""

# Vérifier Node.js
Write-Host "📦 Vérification de Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté : $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Vérifier npm
Write-Host "📦 Vérification de npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm détecté : $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm n'est pas disponible" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Installation des dépendances..." -ForegroundColor Yellow

# Installation Backend
Write-Host ""
Write-Host "📡 Installation du Backend..." -ForegroundColor Cyan
Set-Location "backend"

if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend installé avec succès" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'installation du backend" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ package.json du backend introuvable" -ForegroundColor Red
    exit 1
}

# Installation Frontend
Write-Host ""
Write-Host "🎨 Installation du Frontend..." -ForegroundColor Cyan
Set-Location "../frontend"

if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend installé avec succès" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'installation du frontend" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ package.json du frontend introuvable" -ForegroundColor Red
    exit 1
}

Set-Location ".."

Write-Host ""
Write-Host "📝 Création des fichiers de configuration..." -ForegroundColor Yellow

# Créer .env backend si n'existe pas
$backendEnvPath = "backend\.env"
if (-not (Test-Path $backendEnvPath)) {
    $backendEnvContent = @"
# Base de données
DATABASE_URL="postgresql://username:password@localhost:5432/truesocial"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"

# Redis
REDIS_URL="redis://localhost:6379"

# Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=52428800

# OAuth (optionnel)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"

# Serveur
PORT=3001
NODE_ENV=development
"@
    $backendEnvContent | Out-File -FilePath $backendEnvPath -Encoding UTF8
    Write-Host "✅ Fichier .env backend créé" -ForegroundColor Green
}

# Créer .env.local frontend si n'existe pas
$frontendEnvPath = "frontend\.env.local"
if (-not (Test-Path $frontendEnvPath)) {
    $frontendEnvContent = @"
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
"@
    $frontendEnvContent | Out-File -FilePath $frontendEnvPath -Encoding UTF8
    Write-Host "✅ Fichier .env.local frontend créé" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Installation terminée avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes :" -ForegroundColor Yellow
Write-Host "1. Configurer PostgreSQL et Redis" -ForegroundColor White
Write-Host "2. Modifier les fichiers .env avec vos paramètres" -ForegroundColor White
Write-Host "3. Exécuter les migrations : cd backend && npx prisma migrate dev" -ForegroundColor White
Write-Host "4. Démarrer le backend : cd backend && npm run dev" -ForegroundColor White
Write-Host "5. Démarrer le frontend : cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🌐 L'application sera disponible sur :" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "📖 Consultez le README.md pour plus d'informations" -ForegroundColor Blue