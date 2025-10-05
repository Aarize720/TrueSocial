# TrueSocial Backend - Quick Start

## 🚀 Fast Setup (5 minutes)

### 1. Install PostgreSQL
Download and install from: https://www.postgresql.org/download/windows/

**During installation:**
- Set postgres password (remember it!)
- Use default port: 5432

### 2. Create Database
Open PowerShell and run:
```powershell
psql -U postgres -f setup-database.sql
```

Or use pgAdmin (GUI):
- Create user: `truesocial` / `truesocial123`
- Create database: `truesocial` (owner: truesocial)

### 3. Run Setup Script
```powershell
.\setup.ps1
```

This will:
- ✅ Install dependencies
- ✅ Generate Prisma Client
- ✅ Run migrations
- ✅ Seed database (optional)

### 4. Start Server
```powershell
npm run dev
```

Server runs at: http://localhost:5000

## 📝 Manual Setup

If the script doesn't work:

```powershell
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migrations
npm run prisma:migrate

# 4. Seed database (optional)
npm run db:seed

# 5. Start server
npm run dev
```

## 🔑 Test Credentials

After seeding:
- **Email:** john.doe@example.com
- **Password:** password123

## 🛠️ Useful Commands

```powershell
npm run dev              # Start dev server
npm run prisma:studio    # Open database GUI
npm run db:seed          # Add sample data
npm run db:reset         # Reset database (⚠️ deletes data)
```

## 📚 Full Documentation

See `SETUP_GUIDE.md` for detailed instructions and troubleshooting.

## ❓ Common Issues

### "Authentication failed"
- Check PostgreSQL is running: `Get-Service postgresql*`
- Verify credentials in `.env` file

### "Database does not exist"
- Run: `psql -U postgres -c "CREATE DATABASE truesocial OWNER truesocial;"`

### "Port 5000 already in use"
- Change PORT in `.env` file
- Or kill the process: `netstat -ano | findstr :5000`

## 🎯 What's Next?

1. ✅ Backend is running
2. 📱 Set up the frontend
3. 🧪 Test API endpoints
4. 🚀 Start building features!

## 📞 Need Help?

Check the full setup guide: `SETUP_GUIDE.md`