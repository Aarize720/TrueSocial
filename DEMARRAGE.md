# 🚀 Guide de Démarrage TrueSocial

## ✅ Statut Actuel

**Backend** : ✅ En cours d'exécution sur http://localhost:5000  
**Frontend** : ✅ En cours d'exécution sur http://localhost:3000  
**Base de données** : ✅ PostgreSQL connecté  
**Redis** : ⚠️ Non installé (optionnel)

---

## 🎯 Accès Rapide

### Frontend (Interface utilisateur)
🌐 **Ouvrir dans le navigateur** : http://localhost:3000

### Backend (API)
🔧 **API** : http://localhost:5000/api  
🏥 **Health Check** : http://localhost:5000/health  
📊 **Prisma Studio** : `npm run prisma:studio` (dans le dossier backend)

---

## 🔄 Commandes de Démarrage

### Démarrer le Backend
```powershell
# Ouvrir un terminal PowerShell
cd c:\Users\Aaron\Desktop\xilia\TrueSocial\backend
npm run dev
```
Le backend démarre sur **http://localhost:5000**

### Démarrer le Frontend
```powershell
# Ouvrir un AUTRE terminal PowerShell
cd c:\Users\Aaron\Desktop\xilia\TrueSocial\frontend
npm run dev
```
Le frontend démarre sur **http://localhost:3000**

---

## 🛑 Arrêter les Serveurs

### Méthode 1 : Dans le terminal
- Appuyez sur `Ctrl + C` dans chaque terminal

### Méthode 2 : Tuer les processus
```powershell
# Arrêter le backend (port 5000)
Get-Process node | Where-Object {$_.Path -like "*backend*"} | Stop-Process -Force

# Arrêter le frontend (port 3000)
Get-Process node | Where-Object {$_.Path -like "*frontend*"} | Stop-Process -Force
```

---

## 📦 Données de Test

### Créer des données de test
```powershell
cd c:\Users\Aaron\Desktop\xilia\TrueSocial\backend
npm run db:seed
```

Cela créera :
- 5 utilisateurs de test
- Posts, commentaires, likes
- Relations de suivi
- Stories
- Hashtags tendances

### Identifiants de test
- **Email** : `john.doe@example.com`
- **Mot de passe** : `password123`

---

## 🔧 Commandes Utiles

### Backend
```powershell
cd c:\Users\Aaron\Desktop\xilia\TrueSocial\backend

# Démarrer le serveur
npm run dev

# Voir la base de données (GUI)
npm run prisma:studio

# Générer le client Prisma
npm run prisma:generate

# Créer/appliquer des migrations
npm run prisma:migrate

# Peupler la base de données
npm run db:seed

# Réinitialiser la base de données (⚠️ supprime tout)
npm run db:reset
```

### Frontend
```powershell
cd c:\Users\Aaron\Desktop\xilia\TrueSocial\frontend

# Démarrer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Démarrer en mode production
npm start

# Vérifier le code
npm run lint

# Corriger les erreurs de style
npm run lint:fix
```

---

## 🐛 Dépannage

### Le backend ne démarre pas
```powershell
# Vérifier si PostgreSQL est en cours d'exécution
Get-Service -Name postgresql*

# Vérifier si le port 5000 est libre
netstat -ano | findstr :5000

# Si occupé, tuer le processus
taskkill /PID <PID> /F
```

### Le frontend ne démarre pas
```powershell
# Vérifier si le port 3000 est libre
netstat -ano | findstr :3000

# Si occupé, tuer le processus
taskkill /PID <PID> /F

# Réinstaller les dépendances
cd c:\Users\Aaron\Desktop\xilia\TrueSocial\frontend
Remove-Item -Recurse -Force node_modules
npm install
```

### Erreur de connexion à la base de données
```powershell
# Vérifier que PostgreSQL est démarré
Get-Service -Name postgresql*

# Si arrêté, le démarrer
Start-Service postgresql-x64-14

# Tester la connexion
psql -U truesocial -d truesocial -h localhost
```

### Réinitialiser complètement la base de données
```powershell
cd c:\Users\Aaron\Desktop\xilia\TrueSocial\backend

# Supprimer et recréer la base de données
$env:PGPASSWORD="Aaron720@"
psql -U postgres -c "DROP DATABASE IF EXISTS truesocial;"
psql -U postgres -c "CREATE DATABASE truesocial OWNER truesocial;"
$env:PGPASSWORD=$null

# Recréer le schéma
npm run db:push

# Peupler avec des données de test
npm run db:seed
```

---

## 📱 Utilisation de l'Application

1. **Ouvrir le navigateur** : http://localhost:3000
2. **S'inscrire** ou **Se connecter** avec les identifiants de test
3. **Explorer** :
   - Créer des posts
   - Ajouter des commentaires
   - Liker des posts
   - Suivre d'autres utilisateurs
   - Créer des stories
   - Envoyer des messages

---

## 🔐 Configuration

### Variables d'environnement Backend
Fichier : `backend/.env`
```env
DATABASE_URL=postgresql://truesocial:truesocial123@localhost:5432/truesocial
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
```

### Variables d'environnement Frontend
Fichier : `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

---

## 📚 Ressources

- **Documentation Backend** : `backend/README.md`
- **Documentation Frontend** : `frontend/README.md`
- **Guide de configuration** : `backend/SETUP_GUIDE.md`
- **Démarrage rapide** : `backend/DEMARRAGE_RAPIDE.md`

---

## ✨ Prochaines Étapes

1. ✅ Backend démarré
2. ✅ Frontend démarré
3. ✅ Base de données configurée
4. 🔄 Peupler avec des données de test : `npm run db:seed`
5. 🎨 Ouvrir http://localhost:3000 dans le navigateur
6. 🚀 Commencer à développer !

---

## 💡 Conseils

- **Gardez 2 terminaux ouverts** : un pour le backend, un pour le frontend
- **Utilisez Prisma Studio** pour visualiser/modifier la base de données
- **Consultez les logs** dans les terminaux pour déboguer
- **Hot reload activé** : les changements de code sont automatiquement appliqués

---

## 🆘 Besoin d'aide ?

1. Vérifiez les logs dans les terminaux
2. Consultez les fichiers de documentation
3. Vérifiez que tous les services sont démarrés
4. Consultez les sections de dépannage ci-dessus

**Bon développement ! 🎉**