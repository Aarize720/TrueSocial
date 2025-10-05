# Script de démarrage intelligent pour TrueSocial Backend
# Vérifie et configure automatiquement tout ce qui est nécessaire

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 Démarrage de TrueSocial Backend" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$hasErrors = $false

# 1. Vérifier Node.js
Write-Host "1️⃣  Vérification de Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js non trouvé"
    }
} catch {
    Write-Host "   ❌ Node.js n'est pas installé!" -ForegroundColor Red
    $hasErrors = $true
}

# 2. Vérifier npm
Write-Host "2️⃣  Vérification de npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ npm: v$npmVersion" -ForegroundColor Green
    } else {
        throw "npm non trouvé"
    }
} catch {
    Write-Host "   ❌ npm n'est pas installé!" -ForegroundColor Red
    $hasErrors = $true
}

# 3. Vérifier PostgreSQL
Write-Host "3️⃣  Vérification de PostgreSQL..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PostgreSQL: $pgVersion" -ForegroundColor Green
    } else {
        throw "PostgreSQL non trouvé"
    }
} catch {
    Write-Host "   ❌ PostgreSQL n'est pas installé!" -ForegroundColor Red
    Write-Host "   💡 Installez avec: choco install postgresql" -ForegroundColor Yellow
    $hasErrors = $true
}

# 4. Vérifier le fichier .env
Write-Host "4️⃣  Vérification du fichier .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ Fichier .env trouvé" -ForegroundColor Green
    
    # Vérifier DATABASE_URL
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "DATABASE_URL=") {
        Write-Host "   ✅ DATABASE_URL configuré" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  DATABASE_URL manquant dans .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Fichier .env non trouvé!" -ForegroundColor Red
    Write-Host "   💡 Copiez .env.example vers .env" -ForegroundColor Yellow
    $hasErrors = $true
}

# 5. Vérifier node_modules
Write-Host "5️⃣  Vérification des dépendances..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ Dépendances installées" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Dépendances non installées" -ForegroundColor Yellow
    Write-Host "   📦 Installation des dépendances..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Dépendances installées avec succès" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
        $hasErrors = $true
    }
}

# 6. Vérifier Prisma Client
Write-Host "6️⃣  Vérification de Prisma Client..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma\client") {
    Write-Host "   ✅ Prisma Client généré" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Prisma Client non généré" -ForegroundColor Yellow
    Write-Host "   🔧 Génération de Prisma Client..." -ForegroundColor Cyan
    npm run prisma:generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Prisma Client généré avec succès" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erreur lors de la génération de Prisma Client" -ForegroundColor Red
        $hasErrors = $true
    }
}

# 7. Vérifier la connexion à la base de données
Write-Host "7️⃣  Vérification de la connexion à la base de données..." -ForegroundColor Yellow
$env:PGPASSWORD = "truesocial123"
$dbTest = psql -U truesocial -d truesocial -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Connexion à la base de données réussie" -ForegroundColor Green
} else {
    Write-Host "   ❌ Impossible de se connecter à la base de données" -ForegroundColor Red
    Write-Host "   💡 Exécutez: .\scripts\setup-db.ps1" -ForegroundColor Yellow
    $hasErrors = $true
}
$env:PGPASSWORD = $null

# 8. Vérifier les migrations Prisma
Write-Host "8️⃣  Vérification des migrations..." -ForegroundColor Yellow
if (Test-Path "prisma\migrations") {
    $migrations = Get-ChildItem "prisma\migrations" -Directory
    if ($migrations.Count -gt 0) {
        Write-Host "   ✅ Migrations trouvées ($($migrations.Count))" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Aucune migration trouvée" -ForegroundColor Yellow
        Write-Host "   💡 Exécutez: npm run prisma:migrate" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Dossier migrations non trouvé" -ForegroundColor Yellow
    Write-Host "   💡 Exécutez: npm run prisma:migrate" -ForegroundColor Yellow
}

Write-Host ""

# Si des erreurs critiques, arrêter
if ($hasErrors) {
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "   ❌ Des erreurs critiques ont été détectées" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Corrigez les erreurs ci-dessus avant de continuer" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Tout est OK, démarrer le serveur
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ Tous les prérequis sont satisfaits!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Démarrage du serveur..." -ForegroundColor Cyan
Write-Host ""

# Démarrer en mode développement
npm run dev