# TrueSocial - Clone Instagram Complet

TrueSocial est un clone complet d'Instagram développé avec les technologies modernes. Il inclut toutes les fonctionnalités principales d'un réseau social : feed infini, stories, profils utilisateurs, likes, commentaires, recherche, notifications temps réel, et bien plus.

## 🚀 Fonctionnalités

### Frontend (React/Next.js)
- ✅ **Feed infini** avec scroll automatique
- ✅ **Stories temporaires** avec expiration automatique
- ✅ **Profils utilisateurs** complets avec statistiques
- ✅ **Création de posts** (images/vidéos) avec upload
- ✅ **Système de likes** et commentaires en temps réel
- ✅ **Recherche avancée** (utilisateurs, hashtags, publications)
- ✅ **Notifications temps réel** via WebSocket
- ✅ **Authentification complète** (login/register/OAuth)
- ✅ **Interface responsive** mobile-first
- ✅ **Animations fluides** avec Framer Motion
- ✅ **Design moderne** avec Tailwind CSS

### Backend (Node.js/Express)
- ✅ **API REST complète** avec validation
- ✅ **Authentification JWT** + refresh tokens
- ✅ **OAuth** Google et Facebook
- ✅ **WebSocket** pour temps réel
- ✅ **Upload de médias** avec compression
- ✅ **Système de followers/following**
- ✅ **Gestion des stories** avec expiration
- ✅ **Notifications push**
- ✅ **Rate limiting** et sécurité
- ✅ **Cache Redis** pour performances

### Base de données (PostgreSQL)
- ✅ **Schema optimisé** avec index
- ✅ **Relations complexes** entre entités
- ✅ **Requêtes optimisées** pour le feed
- ✅ **Compteurs en temps réel**
- ✅ **Migrations automatiques**

## 🛠 Technologies Utilisées

### Frontend
- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **Zustand** - Gestion d'état légère
- **React Query** - Gestion des données serveur
- **Socket.io Client** - WebSocket temps réel
- **Framer Motion** - Animations
- **Heroicons** - Icônes
- **Axios** - Client HTTP

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Typage statique
- **PostgreSQL** - Base de données relationnelle
- **Prisma** - ORM moderne
- **Redis** - Cache et sessions
- **Socket.io** - WebSocket serveur
- **JWT** - Authentification
- **Multer** - Upload de fichiers
- **Sharp** - Traitement d'images
- **Bcrypt** - Hachage des mots de passe

## 📁 Structure du Projet

```
TrueSocial/
├── frontend/                 # Application React/Next.js
│   ├── src/
│   │   ├── app/             # Pages Next.js (App Router)
│   │   │   ├── auth/        # Pages d'authentification
│   │   │   ├── profile/     # Page de profil
│   │   │   ├── search/      # Page de recherche
│   │   │   ├── create/      # Création de posts
│   │   │   └── notifications/ # Notifications
│   │   ├── components/      # Composants réutilisables
│   │   │   ├── ui/          # Composants UI de base
│   │   │   ├── layout/      # Composants de layout
│   │   │   ├── post/        # Composants liés aux posts
│   │   │   └── story/       # Composants des stories
│   │   ├── store/           # Stores Zustand
│   │   ├── lib/             # Utilitaires et configuration
│   │   └── types/           # Types TypeScript
│   ├── public/              # Assets statiques
│   └── package.json
├── backend/                 # API Node.js/Express
│   ├── src/
│   │   ├── controllers/     # Contrôleurs API
│   │   ├── middleware/      # Middlewares Express
│   │   ├── models/          # Modèles Prisma
│   │   ├── routes/          # Routes API
│   │   ├── services/        # Services métier
│   │   ├── utils/           # Utilitaires
│   │   └── types/           # Types TypeScript
│   ├── prisma/              # Schema et migrations
│   └── package.json
└── README.md
```

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- npm ou yarn

### 1. Cloner le projet
```bash
git clone <repository-url>
cd TrueSocial
```

### 2. Configuration Backend

```bash
cd backend
npm install
```

Créer le fichier `.env` :
```env
# Base de données
DATABASE_URL="postgresql://username:password@localhost:5432/truesocial"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

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
```

Initialiser la base de données :
```bash
npx prisma migrate dev
npx prisma generate
```

Démarrer le serveur :
```bash
npm run dev
```

### 3. Configuration Frontend

```bash
cd frontend
npm install
```

Créer le fichier `.env.local` :
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

Démarrer l'application :
```bash
npm run dev
```

### 4. Accéder à l'application

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:3001/api
- **Documentation API** : http://localhost:3001/api/docs

## 📱 Utilisation

### Créer un compte
1. Aller sur http://localhost:3000
2. Cliquer sur "Créer un compte"
3. Remplir le formulaire d'inscription
4. Confirmer l'email (si configuré)

### Fonctionnalités principales
- **Feed** : Voir les posts des utilisateurs suivis
- **Stories** : Créer et voir des stories temporaires
- **Profil** : Gérer son profil et voir ses statistiques
- **Recherche** : Trouver des utilisateurs et hashtags
- **Notifications** : Recevoir des notifications en temps réel
- **Messages** : Envoyer des messages privés (à venir)

## 🔧 Scripts Disponibles

### Frontend
```bash
npm run dev          # Démarrage en développement
npm run build        # Build de production
npm run start        # Démarrage en production
npm run lint         # Vérification du code
npm run type-check   # Vérification TypeScript
```

### Backend
```bash
npm run dev          # Démarrage en développement
npm run build        # Build TypeScript
npm run start        # Démarrage en production
npm run test         # Tests unitaires
npm run db:migrate   # Migrations base de données
npm run db:seed      # Données de test
```

## 🏗 Architecture

### Frontend Architecture
- **App Router** : Routing moderne de Next.js 14
- **Component-Based** : Architecture modulaire
- **State Management** : Zustand pour l'état global
- **Data Fetching** : React Query pour le cache
- **Real-time** : Socket.io pour les mises à jour live

### Backend Architecture
- **MVC Pattern** : Séparation des responsabilités
- **Service Layer** : Logique métier centralisée
- **Middleware Stack** : Authentification, validation, logging
- **Database Layer** : Prisma ORM avec PostgreSQL
- **Cache Layer** : Redis pour les performances

### Base de données
```sql
Users (id, username, email, password, profile_picture, bio, created_at)
Posts (id, user_id, caption, media_url, media_type, created_at)
Comments (id, post_id, user_id, content, created_at)
Likes (id, post_id, user_id, created_at)
Follows (id, follower_id, following_id, created_at)
Stories (id, user_id, media_url, expires_at, created_at)
Notifications (id, user_id, type, message, read, created_at)
```

## � Sécurité

- **Authentification JWT** avec refresh tokens
- **Validation des données** côté client et serveur
- **Rate limiting** pour éviter le spam
- **Upload sécurisé** avec validation des fichiers
- **CORS** configuré pour la production
- **Sanitisation** des données utilisateur
- **HTTPS** en production

## 🚀 Déploiement

### Frontend (Vercel)
```bash
npm run build
vercel --prod
```

### Backend (Railway/Heroku)
```bash
# Configurer les variables d'environnement
# Déployer via Git ou CLI
```

### Base de données (Railway/Supabase)
- Configurer PostgreSQL en production
- Exécuter les migrations
- Configurer Redis

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🐛 Problèmes Connus

- Les stories ne s'auto-suppriment pas encore (implémentation en cours)
- Les notifications push ne fonctionnent qu'en développement
- L'upload de vidéos lourdes peut être lent

## 🔮 Roadmap

- [ ] Messages privés
- [ ] Stories avec réactions
- [ ] Mode sombre
- [ ] Application mobile (React Native)
- [ ] Modération automatique
- [ ] Analytics avancées
- [ ] API publique

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation API
- Vérifier les logs serveur

---

**TrueSocial** - Un clone Instagram moderne et complet 🚀