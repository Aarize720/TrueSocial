# 🎯 TrueSocial Backend

Backend API pour TrueSocial - Un clone d'Instagram moderne construit avec Node.js, Express, PostgreSQL et Prisma ORM.

## ⚡ Démarrage Ultra-Rapide

```powershell
# Installation complète automatique
npm run setup:full

# OU étape par étape
npm run setup              # Installer dépendances + générer Prisma
npm run db:setup           # Configurer PostgreSQL
npm run prisma:migrate     # Créer le schéma
npm run dev                # Démarrer le serveur
```

📖 **[Voir le guide de démarrage complet →](START_HERE.md)**

---

## 🏗️ Architecture

### Stack Technique

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Base de données:** PostgreSQL 14+
- **ORM:** Prisma
- **Cache:** Redis (optionnel)
- **WebSocket:** Socket.io
- **Authentification:** JWT + Passport.js
- **Validation:** Joi + Express-validator
- **Upload:** Cloudinary + Multer
- **Logging:** Winston

### Structure du Projet

```
backend/
├── prisma/
│   ├── schema.prisma          # Schéma de la base de données
│   ├── seed.js                # Données de test
│   └── migrations/            # Historique des migrations
├── src/
│   ├── config/
│   │   ├── prisma.js          # Configuration Prisma
│   │   ├── database.js        # Configuration PostgreSQL (legacy)
│   │   └── passport.js        # Configuration authentification
│   ├── middleware/
│   │   ├── errorHandler.js    # Gestion des erreurs
│   │   └── validation.js      # Validation des requêtes
│   ├── routes/
│   │   ├── auth.js            # Routes d'authentification
│   │   ├── users.js           # Routes utilisateurs
│   │   ├── posts.js           # Routes posts
│   │   ├── comments.js        # Routes commentaires
│   │   ├── stories.js         # Routes stories
│   │   └── ...
│   ├── utils/
│   │   └── logger.js          # Utilitaire de logging
│   ├── websocket/
│   │   └── socketHandler.js   # Gestion WebSocket
│   └── server.js              # Point d'entrée
├── scripts/
│   ├── setup-db.ps1           # Script de configuration DB
│   └── start.ps1              # Script de démarrage intelligent
├── .env                       # Variables d'environnement
├── package.json
└── README.md
```

---

## 📊 Modèles de Données

### Modèles Principaux

- **User** - Comptes utilisateurs et profils
- **Post** - Publications avec médias
- **Comment** - Commentaires (avec réponses imbriquées)
- **Like** - Likes sur les posts
- **Follow** - Relations de suivi entre utilisateurs
- **Story** - Stories temporaires (24h)
- **StoryView** - Vues des stories
- **Notification** - Notifications utilisateur
- **SavedPost** - Posts sauvegardés
- **TrendingHashtag** - Hashtags tendances
- **Conversation** - Conversations de messagerie
- **ConversationMember** - Participants aux conversations
- **Message** - Messages directs

### Relations

```
User
├── posts (1:N)
├── comments (1:N)
├── likes (1:N)
├── stories (1:N)
├── followers (N:M via Follow)
├── following (N:M via Follow)
├── notifications (1:N)
└── messages (1:N)

Post
├── author (N:1)
├── comments (1:N)
├── likes (1:N)
└── savedBy (N:M via SavedPost)
```

---

## 🔌 API Endpoints

### Authentification
```
POST   /api/auth/register          # Inscription
POST   /api/auth/login             # Connexion
POST   /api/auth/refresh           # Rafraîchir le token
POST   /api/auth/logout            # Déconnexion
GET    /api/auth/google            # OAuth Google
POST   /api/auth/forgot-password   # Mot de passe oublié
POST   /api/auth/reset-password    # Réinitialiser mot de passe
```

### Utilisateurs
```
GET    /api/users/:id              # Profil utilisateur
PUT    /api/users/:id              # Modifier profil
GET    /api/users/:id/posts        # Posts d'un utilisateur
GET    /api/users/:id/followers    # Followers
GET    /api/users/:id/following    # Following
POST   /api/users/:id/follow       # Suivre
DELETE /api/users/:id/follow       # Ne plus suivre
```

### Posts
```
GET    /api/posts                  # Feed des posts
POST   /api/posts                  # Créer un post
GET    /api/posts/:id              # Détails d'un post
PUT    /api/posts/:id              # Modifier un post
DELETE /api/posts/:id              # Supprimer un post
POST   /api/posts/:id/like         # Liker un post
DELETE /api/posts/:id/like         # Unliker un post
POST   /api/posts/:id/save         # Sauvegarder un post
DELETE /api/posts/:id/save         # Retirer de sauvegardés
```

### Commentaires
```
GET    /api/posts/:id/comments     # Commentaires d'un post
POST   /api/posts/:id/comments     # Ajouter un commentaire
PUT    /api/comments/:id           # Modifier un commentaire
DELETE /api/comments/:id           # Supprimer un commentaire
POST   /api/comments/:id/like      # Liker un commentaire
```

### Stories
```
GET    /api/stories                # Stories du feed
POST   /api/stories                # Créer une story
GET    /api/stories/:id            # Détails d'une story
DELETE /api/stories/:id            # Supprimer une story
POST   /api/stories/:id/view       # Marquer comme vue
```

### Notifications
```
GET    /api/notifications          # Liste des notifications
PUT    /api/notifications/:id/read # Marquer comme lue
DELETE /api/notifications/:id      # Supprimer une notification
```

### Recherche
```
GET    /api/search?q=...           # Recherche globale
GET    /api/search/users?q=...     # Rechercher des utilisateurs
GET    /api/search/hashtags?q=...  # Rechercher des hashtags
```

### Upload
```
POST   /api/upload/image           # Upload d'image
POST   /api/upload/video           # Upload de vidéo
```

---

## 🔐 Authentification

### JWT Tokens

Le système utilise deux tokens :
- **Access Token** : Valide 7 jours, utilisé pour les requêtes API
- **Refresh Token** : Valide 30 jours, utilisé pour renouveler l'access token

### Headers

```http
Authorization: Bearer <access_token>
```

### OAuth

Support de l'authentification via :
- Google OAuth 2.0
- Facebook (optionnel)

---

## 🚀 Déploiement

### Variables d'Environnement

```env
# Base
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Redis (optionnel)
REDIS_URL=redis://localhost:6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend
FRONTEND_URL=https://your-frontend.com
CORS_ORIGINS=https://your-frontend.com
```

### Production

```powershell
# Build
npm run build

# Migrations
npm run prisma:migrate:deploy

# Start
npm start
```

### Docker

```dockerfile
# Dockerfile fourni
docker build -t truesocial-backend .
docker run -p 5000:5000 truesocial-backend
```

---

## 🧪 Tests

```powershell
# Lancer tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:coverage
```

---

## 📈 Monitoring

### Health Check

```http
GET /health
```

Retourne :
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "environment": "production",
  "version": "1.0.0"
}
```

### Logs

Les logs sont gérés par Winston :
- **Console** : En développement
- **Fichier** : `logs/app.log` en production
- **Niveaux** : error, warn, info, debug

---

## 🔧 Développement

### Linting

```powershell
# Vérifier le code
npm run lint

# Corriger automatiquement
npm run lint:fix
```

### Hot Reload

```powershell
npm run dev
```

Utilise `nodemon` pour redémarrer automatiquement lors des changements.

### Prisma Studio

Interface graphique pour explorer la base de données :

```powershell
npm run prisma:studio
```

Ouvre http://localhost:5555

---

## 📚 Documentation

- **[START_HERE.md](START_HERE.md)** - Guide de démarrage rapide
- **[QUICK_START.md](QUICK_START.md)** - Démarrage en 5 minutes
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Guide d'installation détaillé
- **[MIGRATION_TO_PRISMA.md](MIGRATION_TO_PRISMA.md)** - Migration vers Prisma
- **[prisma/README.md](prisma/README.md)** - Documentation Prisma

---

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📝 License

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Équipe

TrueSocial Team

---

## 🆘 Support

- 📧 Email: support@truesocial.com
- 🐛 Issues: [GitHub Issues](https://github.com/truesocial/backend/issues)
- 📖 Docs: [Documentation](https://docs.truesocial.com)

---

## 🎉 Remerciements

- Express.js
- Prisma
- PostgreSQL
- Socket.io
- Et toutes les autres bibliothèques open-source utilisées

---

**Fait avec ❤️ par l'équipe TrueSocial**