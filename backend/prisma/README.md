# Prisma Database Setup

This directory contains the Prisma schema and database configuration for TrueSocial.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up your database
Make sure PostgreSQL is running and your `.env` file contains the correct `DATABASE_URL`:
```
DATABASE_URL=postgresql://truesocial:truesocial123@localhost:5432/truesocial
```

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Create and run migrations
```bash
npm run prisma:migrate
```
This will create the database schema and apply all migrations.

### 5. Seed the database (optional)
```bash
npm run db:seed
```
This will populate your database with sample data for development.

## Available Commands

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Create and apply migrations
- `npm run prisma:migrate:deploy` - Apply migrations in production
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed the database with sample data
- `npm run db:reset` - Reset the database (⚠️ deletes all data)
- `npm run db:push` - Push schema changes without migrations (dev only)

## Database Schema

The schema includes the following models:

- **User** - User accounts and profiles
- **Post** - User posts with media
- **Comment** - Comments on posts (with nested replies)
- **Like** - Post likes
- **Follow** - User follow relationships
- **Story** - Temporary stories (24h)
- **StoryView** - Story view tracking
- **Notification** - User notifications
- **SavedPost** - Saved/bookmarked posts
- **TrendingHashtag** - Trending hashtags tracking
- **Conversation** - Direct message conversations
- **ConversationMember** - Conversation participants
- **Message** - Direct messages

## Making Schema Changes

1. Edit `schema.prisma`
2. Run `npm run prisma:migrate` to create a migration
3. Give your migration a descriptive name
4. The migration will be applied automatically

## Prisma Studio

To view and edit your database visually:
```bash
npm run prisma:studio
```
This will open a web interface at http://localhost:5555

## Production Deployment

1. Set `DATABASE_URL` in production environment
2. Run migrations: `npm run prisma:migrate:deploy`
3. Generate client: `npm run prisma:generate`

## Troubleshooting

### "Prisma schema not found"
Make sure you're in the backend directory and the `prisma/schema.prisma` file exists.

### Migration conflicts
If you have migration conflicts, you can reset the database (⚠️ deletes all data):
```bash
npm run db:reset
```

### Connection issues
- Verify PostgreSQL is running
- Check your `DATABASE_URL` in `.env`
- Ensure the database exists: `createdb truesocial`

## Learn More

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)