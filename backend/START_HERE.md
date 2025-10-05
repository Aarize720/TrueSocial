# 🚀 Démarrage Rapide - TrueSocial Backend

## ⚡ Démarrage en 3 commandes

```powershell
# 1. Installer les dépendances et générer Prisma
npm run setup

# 2. Configurer la base de données (vous demandera le mot de passe postgres)
npm run db:setup

# 3. Créer le schéma et démarrer
npm run prisma:migrate
npm run dev
```

---

## 🎯 Démarrage Automatique Complet

Si vous voulez tout configurer automatiquement :

```powershell
npm run setup:full
```

Cette commande va :
- ✅ Installer toutes les dépendances
- ✅ Générer le client Prisma
- ✅ Configurer la base de données PostgreSQL
- ✅ Créer le schéma de la base
- ✅ Peupler avec des données de test

---

## 🔍 Démarrage avec Vérifications

Pour démarrer avec une vérification complète de tous les prérequis :

```powershell
npm run start:check
```

Ce script va :
- ✅ Vérifier Node.js et npm
- ✅ Vérifier PostgreSQL
- ✅ Vérifier le fichier .env
- ✅ Installer les dépendances si nécessaire
- ✅ Générer Prisma Client si nécessaire
- ✅ Tester la connexion à la base de données
- ✅ Démarrer le serveur

---

## 📋 Prérequis

### 1. PostgreSQL

**Vérifier si installé :**
```powershell
psql --version
```

**Si non installé, choisissez une méthode :**

#### Option A : Chocolatey (Recommandé)
```powershell
choco install postgresql
```

#### Option B : Téléchargement Direct
Téléchargez depuis : https://www.postgresql.org/download/windows/

#### Option C : Docker
```powershell
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

### 2. Node.js 18+

**Vérifier :**
```powershell
node --version
```

**Installer si nécessaire :**
- Téléchargez depuis : https://nodejs.org/

---

## 🗄️ Configuration de la Base de Données

### Méthode 1 : Script Automatique (Recommandé)

```powershell
npm run db:setup
```

Vous serez invité à entrer le mot de passe du superuser `postgres`.

### Méthode 2 : Manuel avec psql

```powershell
psql -U postgres -f setup-database.sql
```

### Méthode 3 : pgAdmin (Interface Graphique)

1. Ouvrez pgAdmin
2. Créez un utilisateur : `truesocial` / `truesocial123`
3. Créez une base : `truesocial` (owner: truesocial)

---

## 🔧 Configuration

### Fichier .env

Vérifiez que votre fichier `.env` contient :

```env
DATABASE_URL=postgresql://truesocial:truesocial123@localhost:5432/truesocial
PORT=5000
NODE_ENV=development
```

---

## 📊 Commandes Utiles

### Développement
```powershell
npm run dev              # Démarrer en mode développement (avec hot-reload)
npm run start            # Démarrer en mode production
npm run start:check      # Démarrer avec vérifications complètes
```

### Base de Données
```powershell
npm run db:setup         # Configurer PostgreSQL (créer DB et user)
npm run prisma:generate  # Générer le client Prisma
npm run prisma:migrate   # Créer/appliquer les migrations
npm run db:seed          # Peupler avec des données de test
npm run prisma:studio    # Ouvrir l'interface graphique Prisma Studio
npm run db:reset         # Réinitialiser la base (⚠️ supprime tout)
```

### Prisma
```powershell
npm run prisma:generate  # Générer le client Prisma
npm run prisma:migrate   # Créer une migration
npm run prisma:studio    # Interface graphique de la base
npm run db:push          # Pousser le schéma sans migration (dev only)
```

### Tests et Qualité
```powershell
npm test                 # Lancer les tests
npm run test:watch       # Tests en mode watch
npm run test:coverage    # Tests avec couverture
npm run lint             # Vérifier le code
npm run lint:fix         # Corriger automatiquement
```

---

## 🎨 Prisma Studio

Pour explorer visuellement votre base de données :

```powershell
npm run prisma:studio
```

Ouvre une interface web sur : http://localhost:5555

---

## 🧪 Données de Test

Après avoir exécuté `npm run db:seed`, vous aurez :

### Utilisateurs de Test

| Email | Mot de passe | Description |
|-------|--------------|-------------|
| john.doe@example.com | password123 | Utilisateur principal |
| jane.smith@example.com | password123 | Utilisateur 2 |
| bob.wilson@example.com | password123 | Utilisateur 3 |
| alice.brown@example.com | password123 | Utilisateur 4 |
| charlie.davis@example.com | password123 | Utilisateur 5 |

### Contenu
- ✅ 10+ posts avec images
- ✅ Relations de suivi (follows)
- ✅ Likes et commentaires
- ✅ Stories actives
- ✅ Hashtags tendances

---

## 🔍 Vérification du Serveur

Une fois démarré, testez :

### Health Check
```powershell
curl http://localhost:5000/health
```

### API Root
```powershell
curl http://localhost:5000/
```

### Logs
Le serveur affichera :
```
═══════════════════════════════════════════════════════
   🎉 Serveur TrueSocial démarré avec succès!
═══════════════════════════════════════════════════════
📱 Environment: development
🌐 API: http://localhost:5000/api
🏥 Health: http://localhost:5000/health
🔌 WebSocket: ws://localhost:5000
📊 Prisma Studio: npm run prisma:studio
═══════════════════════════════════════════════════════
```

---

## ❌ Dépannage

### Erreur : "PostgreSQL n'est pas installé"
```powershell
# Installer avec Chocolatey
choco install postgresql

# OU télécharger depuis
# https://www.postgresql.org/download/windows/
```

### Erreur : "Base de données n'existe pas"
```powershell
npm run db:setup
```

### Erreur : "Prisma Client non généré"
```powershell
npm run prisma:generate
```

### Erreur : "Migrations non appliquées"
```powershell
npm run prisma:migrate
```

### Erreur : "Redis non disponible"
Redis est optionnel. Le serveur démarrera avec un avertissement mais fonctionnera.

Pour installer Redis :
```powershell
# Avec Chocolatey
choco install redis-64

# OU avec Docker
docker run --name redis -p 6379:6379 -d redis
```

### Erreur : "Port 5000 déjà utilisé"
Changez le port dans `.env` :
```env
PORT=5001
```

---

## 📚 Documentation Complète

- **QUICK_START.md** - Guide de démarrage rapide
- **SETUP_GUIDE.md** - Guide d'installation détaillé
- **MIGRATION_TO_PRISMA.md** - Guide de migration vers Prisma
- **prisma/README.md** - Documentation Prisma spécifique

---

## 🆘 Besoin d'Aide ?

1. Vérifiez les logs du serveur
2. Consultez les fichiers de documentation
3. Vérifiez que tous les prérequis sont installés
4. Essayez `npm run start:check` pour un diagnostic complet

---

## 🎉 C'est Parti !

Une fois tout configuré, vous êtes prêt à développer !

```powershell
npm run dev
```

Bon développement ! 🚀