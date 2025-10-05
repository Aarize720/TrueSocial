# TrueSocial Backend Setup Guide

This guide will help you set up the complete backend environment for TrueSocial.

## Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 14+ (we'll install this)
- Redis (optional, for caching)

## Step 1: Install PostgreSQL

### Option A: Using Official Installer (Recommended for Windows)

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the latest PostgreSQL installer (version 14 or higher)
   - Or use this direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Run the Installer:**
   - Run the downloaded `.exe` file
   - Click "Next" through the welcome screens
   - Choose installation directory (default is fine)
   - Select components: PostgreSQL Server, pgAdmin 4, Command Line Tools
   - Choose data directory (default is fine)
   - **Set a password for the postgres superuser** (remember this!)
   - Port: 5432 (default)
   - Locale: Default locale
   - Complete the installation

3. **Verify Installation:**
   ```powershell
   # Check if PostgreSQL is running
   Get-Service -Name postgresql*
   
   # Or check the version
   psql --version
   ```

### Option B: Using Chocolatey (if you have it installed)

```powershell
choco install postgresql
```

### Option C: Using Docker (Alternative)

```powershell
docker run --name truesocial-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
```

## Step 2: Create Database and User

### Method 1: Using pgAdmin (GUI - Easiest)

1. **Open pgAdmin 4** (installed with PostgreSQL)
2. **Connect to PostgreSQL:**
   - Right-click "Servers" → "Register" → "Server"
   - Name: localhost
   - Host: localhost
   - Port: 5432
   - Username: postgres
   - Password: (the password you set during installation)

3. **Create User:**
   - Right-click "Login/Group Roles" → "Create" → "Login/Group Role"
   - General tab: Name = `truesocial`
   - Definition tab: Password = `truesocial123`
   - Privileges tab: Check "Can login?" and "Create databases?"
   - Click "Save"

4. **Create Database:**
   - Right-click "Databases" → "Create" → "Database"
   - Database: `truesocial`
   - Owner: `truesocial`
   - Click "Save"

### Method 2: Using Command Line (psql)

```powershell
# Open PowerShell as Administrator and run:

# Connect to PostgreSQL as superuser
psql -U postgres

# In the psql prompt, run these commands:
CREATE USER truesocial WITH PASSWORD 'truesocial123';
CREATE DATABASE truesocial OWNER truesocial;
GRANT ALL PRIVILEGES ON DATABASE truesocial TO truesocial;

# Exit psql
\q
```

### Method 3: Using SQL Script

Save this as `setup-db.sql` and run it:

```sql
-- Create user
CREATE USER truesocial WITH PASSWORD 'truesocial123';

-- Create database
CREATE DATABASE truesocial OWNER truesocial;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE truesocial TO truesocial;

-- Connect to the database
\c truesocial

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO truesocial;
```

Run it with:
```powershell
psql -U postgres -f setup-db.sql
```

## Step 3: Verify Database Connection

Test the connection:

```powershell
# Try connecting to the database
psql -U truesocial -d truesocial -h localhost

# If successful, you'll see:
# truesocial=>

# Exit with:
\q
```

## Step 4: Install Node.js Dependencies

```powershell
cd c:\Users\Aaron\Desktop\xilia\TrueSocial\backend
npm install
```

## Step 5: Configure Environment Variables

Your `.env` file should already have:
```env
DATABASE_URL=postgresql://truesocial:truesocial123@localhost:5432/truesocial
```

If you used different credentials, update this line accordingly.

## Step 6: Run Prisma Migrations

Now that PostgreSQL is set up, create the database schema:

```powershell
# Generate Prisma Client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# When prompted, enter a name like: "init"
```

This will create all the tables in your database.

## Step 7: Seed the Database (Optional)

Add sample data for development:

```powershell
npm run db:seed
```

This creates:
- 5 test users
- Sample posts, comments, likes
- Follow relationships
- Stories
- Trending hashtags

**Test credentials:**
- Email: `john.doe@example.com`
- Password: `password123`

## Step 8: Start the Development Server

```powershell
npm run dev
```

The server should start on http://localhost:5000

## Step 9: Verify Everything Works

### Check Database with Prisma Studio:
```powershell
npm run prisma:studio
```
Opens a GUI at http://localhost:5555 to view your database.

### Test API Endpoints:
```powershell
# Health check
curl http://localhost:5000/health

# Or open in browser:
# http://localhost:5000/health
```

## Optional: Install Redis (for caching)

### Using Chocolatey:
```powershell
choco install redis-64
```

### Using Docker:
```powershell
docker run --name truesocial-redis -p 6379:6379 -d redis:7
```

### Using Windows Subsystem for Linux (WSL):
```bash
sudo apt-get install redis-server
sudo service redis-server start
```

## Troubleshooting

### PostgreSQL not starting
```powershell
# Check service status
Get-Service -Name postgresql*

# Start the service
Start-Service postgresql-x64-14  # Adjust version number
```

### Connection refused
- Make sure PostgreSQL is running
- Check if port 5432 is available: `netstat -an | findstr 5432`
- Verify firewall isn't blocking the connection

### Authentication failed
- Double-check username and password in `.env`
- Verify user exists: `psql -U postgres -c "\du"`
- Verify database exists: `psql -U postgres -c "\l"`

### Prisma migration errors
```powershell
# Reset database (⚠️ deletes all data)
npm run db:reset

# Or manually drop and recreate:
psql -U postgres -c "DROP DATABASE IF EXISTS truesocial;"
psql -U postgres -c "CREATE DATABASE truesocial OWNER truesocial;"
npm run prisma:migrate
```

### Port already in use
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## Next Steps

1. ✅ PostgreSQL installed and running
2. ✅ Database and user created
3. ✅ Prisma migrations applied
4. ✅ Database seeded with sample data
5. ✅ Development server running

Now you can:
- Start developing the API
- Test endpoints with Postman or curl
- View database with Prisma Studio
- Connect the frontend application

## Useful Commands Reference

```powershell
# Database
npm run prisma:generate      # Generate Prisma Client
npm run prisma:migrate       # Create and apply migrations
npm run prisma:studio        # Open database GUI
npm run db:seed              # Seed database
npm run db:reset             # Reset database

# Development
npm run dev                  # Start dev server with hot reload
npm start                    # Start production server
npm test                     # Run tests

# Code Quality
npm run lint                 # Check code style
npm run lint:fix             # Fix code style issues
```

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the error messages carefully
3. Check PostgreSQL logs: `C:\Program Files\PostgreSQL\14\data\log\`
4. Verify all services are running