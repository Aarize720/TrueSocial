# Script de démarrage rapide pour TrueSocial
# Exécuter avec : powershell -ExecutionPolicy Bypass -File start.ps1

Write-Host "🚀 Démarrage de TrueSocial..." -ForegroundColor Green
Write-Host ""

# Vérifier si les dépendances sont installées
if (-not (Test-Path "backend\node_modules") -or -not (Test-Path "frontend\node_modules")) {
    Write-Host "❌ Les dépendances ne sont pas installées." -ForegroundColor Red
    Write-Host "Exécutez d'abord : powershell -ExecutionPolicy Bypass -File install.ps1" -ForegroundColor Yellow
    exit 1
}

# Vérifier les fichiers de configuration
if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ Fichier .env backend manquant" -ForegroundColor Red
    Write-Host "Copiez backend\.env.example vers backend\.env et configurez-le" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "❌ Fichier .env.local frontend manquant" -ForegroundColor Red
    Write-Host "Copiez frontend\.env.example vers frontend\.env.local et configurez-le" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔧 Vérification de la base de données..." -ForegroundColor Yellow

# Vérifier si Prisma est configuré
Set-Location "backend"
try {
    npx prisma db push --accept-data-loss 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Base de données configurée" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Problème avec la base de données. Vérifiez votre configuration." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Impossible de vérifier la base de données" -ForegroundColor Yellow
}

Set-Location ".."

Write-Host ""
Write-Host "🚀 Démarrage des serveurs..." -ForegroundColor Green

# Fonction pour démarrer un processus en arrière-plan
function Start-BackgroundProcess {
    param(
        [string]$WorkingDirectory,
        [string]$Command,
        [string]$Arguments,
        [string]$Name
    )
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $Command
    $processInfo.Arguments = $Arguments
    $processInfo.WorkingDirectory = $WorkingDirectory
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $false
    
    $process = [System.Diagnostics.Process]::Start($processInfo)
    Write-Host "✅ $Name démarré (PID: $($process.Id))" -ForegroundColor Green
    return $process
}

# Démarrer le backend
Write-Host "📡 Démarrage du Backend..." -ForegroundColor Cyan
$backendProcess = Start-BackgroundProcess -WorkingDirectory "backend" -Command "npm" -Arguments "run dev" -Name "Backend"

# Attendre un peu avant de démarrer le frontend
Start-Sleep -Seconds 3

# Démarrer le frontend
Write-Host "🎨 Démarrage du Frontend..." -ForegroundColor Cyan
$frontendProcess = Start-BackgroundProcess -WorkingDirectory "frontend" -Command "npm" -Arguments "run dev" -Name "Frontend"

Write-Host ""
Write-Host "🎉 TrueSocial est en cours de démarrage !" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs disponibles :" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "   API Docs: http://localhost:3001/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Attendez quelques secondes que les serveurs démarrent complètement..." -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 Pour arrêter les serveurs, fermez cette fenêtre ou appuyez sur Ctrl+C" -ForegroundColor Red
Write-Host ""

# Attendre que l'utilisateur ferme la fenêtre
try {
    Write-Host "Appuyez sur Ctrl+C pour arrêter les serveurs..." -ForegroundColor Gray
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Nettoyer les processus à la fermeture
    Write-Host ""
    Write-Host "🛑 Arrêt des serveurs..." -ForegroundColor Yellow
    
    if ($backendProcess -and -not $backendProcess.HasExited) {
        $backendProcess.Kill()
        Write-Host "✅ Backend arrêté" -ForegroundColor Green
    }
    
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        $frontendProcess.Kill()
        Write-Host "✅ Frontend arrêté" -ForegroundColor Green
    }
    
    Write-Host "👋 Au revoir !" -ForegroundColor Green
}