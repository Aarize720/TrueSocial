# 🚀 Démarrage Rapide - TrueSocial Backend

## ⚡ Configuration en 3 Étapes

### Étape 1 : Configurer PostgreSQL

**Option A - Script SQL Simple (Recommandé)**
```powershell
psql -U postgres -f setup-database.sql
```
*Entrez le mot de passe postgres quand demandé*

**Option B - Commandes Manuelles**
```powershell
# Se connecter à PostgreSQL
psql -U postgres

# Dans psql, exécutez:
CREATE USER truesocial WITH PASSWORD 'truesocial123';
CREATE DATABASE truesocial OWNER truesocial;
GRANT ALL PRIVILEGES ON DATABASE truesocial TO truesocial;
\q
```

### Étape 2 : Configurer Prisma

```powershell
# Générer le client Prisma
npm run prisma:generate

# Créer le schéma de la base de données
npm run prisma:migrate
```

### Étape 3 : Démarrer le Serveur

```powershell
npm run dev
```

---

## ✅ Vérification

Si tout fonctionne, vous verrez :

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

## 🔧 Dépannage

### Erreur : "authentification par mot de passe échouée"

**Solution :**
```powershell
# Vérifiez que l'utilisateur existe
psql -U postgres -c "\du"

# Recréez l'utilisateur si nécessaire
psql -U postgres -c "DROP USER IF EXISTS truesocial;"
psql -U postgres -c "CREATE USER truesocial WITH PASSWORD 'truesocial123';"
```

### Erreur : "Prisma schema not found"

**Solution :**
```powershell
npm run prisma:generate
```

### Erreur : "Cannot find module '@prisma/client'"

**Solution :**
```powershell
npm install
npm run prisma:generate
```

### Redis non disponible

**Ce n'est pas grave !** Redis est optionnel. Le serveur démarre quand même avec un avertissement.

---

## 📚 Commandes Utiles

```powershell
# Voir la base de données graphiquement
npm run prisma:studio

# Réinitialiser la base de données
npm run db:reset

# Peupler avec des données de test
npm run db:seed

# Voir les logs en temps réel
npm run dev
```

---

## 🆘 Besoin d'Aide ?

1. **Documentation complète** : Consultez `INDEX.md`
2. **Guide détaillé** : Consultez `START_HERE.md`
3. **Toutes les commandes** : Consultez `QUICK_COMMANDS.md`
4. **Problèmes résolus** : Consultez `FIXES_APPLIED.md`

---

## 🎯 Configuration Actuelle

- **Base de données** : PostgreSQL 18.0 ✅
- **ORM** : Prisma ✅
- **Node.js** : v22.20.0 ✅
- **Port** : 5000
- **Environment** : development

**Tout est prêt ! Bon développement ! 🚀**