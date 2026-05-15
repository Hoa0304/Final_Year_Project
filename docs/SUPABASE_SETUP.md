# Supabase Setup Guide

This guide will help you set up Supabase for the HMall project, both locally and remotely.

## Local Setup

### Prerequisites

- Node.js (v18 or higher)
- Docker Desktop (required for local Supabase)
- Supabase CLI

### Installation

1. **Install Supabase CLI globally:**
```bash
npm install -g supabase
```

2. **Verify installation:**
```bash
supabase --version
```

### Starting Supabase Locally

1. **Navigate to the supabase directory:**
```bash
cd supabase
```

2. **Start Supabase:**
```bash
supabase start
```

This command will:
- Download and start Docker containers for PostgreSQL, PostgREST, GoTrue, Storage, and other services
- Create local database
- Run migrations
- Generate API keys

3. **Save the output** - You'll see connection details like:
```
API URL: http://localhost:54330
GraphQL URL: http://localhost:54330/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54331/postgres
Studio URL: http://localhost:54332
anon key: eyJhbGc...
service_role key: eyJhbGc...
```

**Note:** Ports have been changed to avoid conflicts:
- API: 54330 (was 54321)
- Database: 54331 (was 54322)
- Studio: 54332 (was 54323)
- Realtime: 54333 (was 54324)
- Inbucket: 54334-54336 (was 54325-54327)

4. **Copy these values to your `.env` files:**
   - `backend/.env` - Use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `frontend/.env` - Use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Accessing Supabase Studio

Open http://localhost:54332 in your browser to access the Supabase Studio dashboard where you can:
- View and edit database tables
- Run SQL queries
- Manage authentication
- View API documentation

### Stopping Supabase

```bash
supabase stop
```

### Resetting Database

To reset the database and re-run migrations:
```bash
supabase db reset
```

## Remote Setup (Production)

### Creating a Supabase Project

1. **Sign up/Login to Supabase:**
   - Go to https://supabase.com
   - Sign up or log in to your account

2. **Create a new project:**
   - Click "New Project"
   - Fill in project details:
     - Name: `HMall` (or your preferred name)
     - Database Password: (choose a strong password)
     - Region: (choose closest to your users)
   - Click "Create new project"

3. **Wait for project setup** (takes 1-2 minutes)

### Getting Project Credentials

1. **Go to Project Settings:**
   - Click on your project
   - Navigate to Settings > API

2. **Copy the following:**
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` `public` key
   - `service_role` `secret` key (keep this secure!)

3. **Get Database Connection String:**
   - Go to Settings > Database
   - Copy the connection string under "Connection string" > "URI"
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

### Linking Local Project to Remote

1. **Login to Supabase CLI:**
```bash
supabase login
```

2. **Link your project:**
```bash
cd supabase
supabase link --project-ref your-project-ref
```

You can find your project ref in the project URL or settings.

3. **Push migrations to remote:**
```bash
supabase db push
```

### Environment Variables for Remote

Update your `.env` files with remote credentials:

**backend/.env:**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**frontend/.env:**
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Migrations

### Creating a New Migration

```bash
cd supabase
supabase migration new migration_name
```

This creates a new file in `supabase/migrations/` with a timestamp prefix.

### Applying Migrations

**Local:**
```bash
supabase db reset
```

**Remote:**
```bash
supabase db push
```

## Troubleshooting

### Docker Issues

If Supabase fails to start:
1. Ensure Docker Desktop is running
2. Check Docker has enough resources allocated (4GB RAM minimum)
3. Try: `supabase stop` then `supabase start`

### Connection Issues

- Verify your `.env` files have correct credentials
- Check if Supabase is running: `supabase status`
- Ensure ports 54321-54327 are not in use

### Migration Errors

- Check migration SQL syntax
- Ensure previous migrations are applied
- Review error messages in Supabase Studio logs

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use `anon` key in frontend** - It respects Row Level Security (RLS)
3. **Use `service_role` key only in backend** - It bypasses RLS
4. **Enable RLS on tables** - Add policies to protect user data
5. **Rotate keys regularly** - Especially if exposed

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)


