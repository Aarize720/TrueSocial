# Script de configuration automatique de la base de donnees TrueSocial
# Ce script configure PostgreSQL sans interaction utilisateur

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Configuration de la base de donnees TrueSocial" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier si PostgreSQL est installe
Write-Host "[1/5] Verification de PostgreSQL..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] PostgreSQL trouve: $pgVersion" -ForegroundColor Green
    } else {
        throw "PostgreSQL non trouve"
    }
} catch {
    Write-Host "[ERREUR] PostgreSQL n'est pas installe!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installez PostgreSQL avec l'une de ces methodes:" -ForegroundColor Yellow
    Write-Host "   1. Chocolatey: choco install postgresql" -ForegroundColor White
    Write-Host "   2. Telechargement: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "   3. Docker: docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Demander le mot de passe postgres
Write-Host ""
Write-Host "[2/5] Entrez le mot de passe du superuser 'postgres':" -ForegroundColor Yellow
Write-Host "      (Defini lors de l'installation de PostgreSQL)" -ForegroundColor Gray
$securePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$postgresPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Definir la variable d'environnement pour eviter le prompt
$env:PGPASSWORD = $postgresPassword

Write-Host ""
Write-Host "[3/5] Creation de la base de donnees et de l'utilisateur..." -ForegroundColor Yellow

# Verifier si la base de donnees existe deja
$dbExists = psql -U postgres -lqt 2>&1 | Select-String -Pattern "truesocial" -Quiet

if ($dbExists) {
    Write-Host "[INFO] La base de donnees 'truesocial' existe deja" -ForegroundColor Yellow
    $response = Read-Host "Voulez-vous la recreer? (o/N)"
    
    if ($response -eq "o" -or $response -eq "O") {
        Write-Host "[INFO] Suppression de l'ancienne base de donnees..." -ForegroundColor Yellow
        psql -U postgres -c "DROP DATABASE IF EXISTS truesocial;" 2>&1 | Out-Null
        psql -U postgres -c "DROP USER IF EXISTS truesocial;" 2>&1 | Out-Null
        Write-Host "[OK] Ancienne base supprimee" -ForegroundColor Green
    } else {
        Write-Host "[OK] Conservation de la base existante" -ForegroundColor Green
        $env:PGPASSWORD = $null
        Write-Host ""
        Write-Host "Prochaines etapes:" -ForegroundColor Cyan
        Write-Host "   1. npm run prisma:generate" -ForegroundColor White
        Write-Host "   2. npm run prisma:migrate" -ForegroundColor White
        Write-Host "   3. npm run db:seed (optionnel)" -ForegroundColor White
        Write-Host "   4. npm run dev" -ForegroundColor White
        Write-Host ""
        exit 0
    }
}

# Creer l'utilisateur et la base de donnees
Write-Host "[4/5] Creation de l'utilisateur 'truesocial'..." -ForegroundColor Yellow
$createUserResult = psql -U postgres -c "CREATE USER truesocial WITH PASSWORD 'truesocial123';" 2>&1

if ($LASTEXITCODE -eq 0 -or $createUserResult -like '*already exists*') {
    Write-Host "[OK] Utilisateur cree ou existe deja" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Erreur lors de la creation de l'utilisateur" -ForegroundColor Red
    Write-Host $createUserResult -ForegroundColor Red
    $env:PGPASSWORD = $null
    exit 1
}

Write-Host "[4/5] Creation de la base de donnees 'truesocial'..." -ForegroundColor Yellow
$createDbResult = psql -U postgres -c "CREATE DATABASE truesocial OWNER truesocial;" 2>&1

if ($LASTEXITCODE -eq 0 -or $createDbResult -like '*already exists*') {
    Write-Host "[OK] Base de donnees creee ou existe deja" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Erreur lors de la creation de la base de donnees" -ForegroundColor Red
    Write-Host $createDbResult -ForegroundColor Red
    $env:PGPASSWORD = $null
    exit 1
}

Write-Host "[5/5] Attribution des privileges..." -ForegroundColor Yellow
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE truesocial TO truesocial;" 2>&1 | Out-Null
psql -U postgres -d truesocial -c "GRANT ALL ON SCHEMA public TO truesocial;" 2>&1 | Out-Null
psql -U postgres -d truesocial -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO truesocial;" 2>&1 | Out-Null
psql -U postgres -d truesocial -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO truesocial;" 2>&1 | Out-Null

Write-Host "[OK] Privileges attribues" -ForegroundColor Green

# Nettoyer le mot de passe
$env:PGPASSWORD = $null

# Tester la connexion avec le nouvel utilisateur
Write-Host ""
Write-Host "Test de connexion avec l'utilisateur 'truesocial'..." -ForegroundColor Yellow
$env:PGPASSWORD = "truesocial123"
$testResult = psql -U truesocial -d truesocial -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Connexion reussie!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Avertissement: Test de connexion echoue" -ForegroundColor Yellow
    Write-Host $testResult -ForegroundColor Yellow
}

$env:PGPASSWORD = $null

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "   Configuration terminee avec succes!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Informations de connexion:" -ForegroundColor Cyan
Write-Host "   Base de donnees: truesocial" -ForegroundColor White
Write-Host "   Utilisateur: truesocial" -ForegroundColor White
Write-Host "   Mot de passe: truesocial123" -ForegroundColor White
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: 5432" -ForegroundColor White
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Cyan
Write-Host "   1. npm run prisma:generate    # Generer le client Prisma" -ForegroundColor White
Write-Host "   2. npm run prisma:migrate     # Creer le schema de la base" -ForegroundColor White
Write-Host "   3. npm run db:seed            # Peupler avec des donnees de test (optionnel)" -ForegroundColor White
Write-Host "   4. npm run dev                # Demarrer le serveur" -ForegroundColor White
Write-Host ""
Write-Host "Astuce: Utilisez 'npm run prisma:studio' pour explorer la base de donnees" -ForegroundColor Yellow
Write-Host ""