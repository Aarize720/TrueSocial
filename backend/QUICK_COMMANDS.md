# ⚡ Commandes Rapides - TrueSocial Backend

## 🚀 Démarrage Rapide

### Option 1 : Tout Automatique (Recommandé)
```powershell
npm run setup:full
```
✅ Installe tout, configure PostgreSQL, crée le schéma, ajoute des données de test

### Option 2 : Étape par Étape
```powershell
npm run setup              # 1. Installer + générer Prisma
npm run db:setup           # 2. Configurer PostgreSQL
npm run prisma:migrate     # 3. Créer le schéma
npm run db:seed            # 4. Ajouter données de test (optionnel)
npm run dev                # 5. Démarrer
```

### Option 3 : Démarrage avec Vérifications
```powershell
npm run start:check
```
✅ Vérifie tout et démarre automatiquement

---

## 📦 Installation

```powershell
# Installer les dépendances
npm install

# Installer + générer Prisma
npm run setup
```

---

## 🗄️ Base de Données

### Configuration
```powershell
# Configurer PostgreSQL (interactif)
npm run db:setup

# OU manuellement
psql -U postgres -f setup-database.sql
```

### Prisma
```powershell
# Générer le client Prisma
npm run prisma:generate

# Créer/appliquer les migrations
npm run prisma:migrate

# Pousser le schéma sans migration (dev only)
npm run db:push

# Réinitialiser la base (⚠️ supprime tout)
npm run db:reset
```

### Données
```powershell
# Peupler avec des données de test
npm run db:seed
```

---

## 🎨 Prisma Studio

```powershell
# Ouvrir l'interface graphique
npm run prisma:studio
```
📊 Ouvre http://localhost:5555

---

## 🏃 Démarrage

```powershell
# Mode développement (hot-reload)
npm run dev

# Mode production
npm start

# Avec vérifications complètes
npm run start:check
```

---

## 🧪 Tests

```powershell
# Lancer les tests
npm test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:coverage
```

---

## 🔍 Qualité du Code

```powershell
# Vérifier le code
npm run lint

# Corriger automatiquement
npm run lint:fix
```

---

## 🔧 Dépannage

### Vérifier PostgreSQL
```powershell
psql --version
```

### Tester la connexion
```powershell
$env:PGPASSWORD='truesocial123'
psql -U truesocial -d truesocial -c "SELECT version();"
$env:PGPASSWORD=$null
```

### Recréer la base
```powershell
npm run db:reset
npm run prisma:migrate
npm run db:seed
```

### Régénérer Prisma
```powershell
npm run prisma:generate
```

---

## 📊 Informations

### Health Check
```powershell
curl http://localhost:5000/health
```

### API Root
```powershell
curl http://localhost:5000/
```

---

## 🔐 Données de Test

Après `npm run db:seed` :

**Utilisateurs :**
- john.doe@example.com / password123
- jane.smith@example.com / password123
- bob.wilson@example.com / password123
- alice.brown@example.com / password123
- charlie.davis@example.com / password123

---

## 📚 Documentation

| Fichier | Description |
|---------|-------------|
| `START_HERE.md` | 🚀 Guide de démarrage principal |
| `README.md` | 📖 Documentation complète |
| `QUICK_START.md` | ⚡ Démarrage en 5 minutes |
| `SETUP_GUIDE.md` | 🔧 Guide d'installation détaillé |
| `MIGRATION_TO_PRISMA.md` | 🔄 Guide de migration |
| `SETUP_CHECKLIST.md` | ✅ Checklist de progression |
| `FIXES_APPLIED.md` | 🔧 Correctifs appliqués |

---

## 🎯 Commandes par Scénario

### Premier Démarrage
```powershell
npm run setup:full
npm run dev
```

### Après un git pull
```powershell
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### Réinitialiser tout
```powershell
npm run db:reset
npm run prisma:migrate
npm run db:seed
npm run dev
```

### Problème de connexion DB
```powershell
npm run db:setup
npm run prisma:migrate
npm run dev
```

### Problème Prisma
```powershell
npm run prisma:generate
npm run dev
```

---

## 🆘 Aide Rapide

| Problème | Solution |
|----------|----------|
| PostgreSQL non installé | `choco install postgresql` |
| Base de données n'existe pas | `npm run db:setup` |
| Prisma Client non généré | `npm run prisma:generate` |
| Migrations non appliquées | `npm run prisma:migrate` |
| Port 5000 occupé | Changez `PORT` dans `.env` |
| Redis non disponible | Normal, Redis est optionnel |

---

## 💡 Astuces

### Changer le port
```env
# Dans .env
PORT=5001
```

### Voir les logs SQL
```env
# Dans .env
LOG_LEVEL=debug
```

### Désactiver le rate limiting
```env
# Dans .env
RATE_LIMIT_MAX_REQUESTS=999999
```

---

## 🔗 Liens Utiles

- **Prisma Docs:** https://www.prisma.io/docs
- **Express Docs:** https://expressjs.com/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

**Gardez ce fichier à portée de main pour un accès rapide aux commandes ! 📌**