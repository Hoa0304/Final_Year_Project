# HMall Setup Guide

Complete setup instructions for the HMall project.

## Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- **Git**
- **Docker Desktop** (for local Supabase)
- **Expo CLI** (for React Native development)

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd HMall
```

### 2. Install Dependencies

Install all dependencies for root, backend, frontend, and AI service:

```bash
npm run setup
```

Or manually:

```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd ai-service && npm install && cd ..
```

### 3. Setup Supabase Local

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

Quick version:
```bash
# Install Supabase CLI
npm install -g supabase

# Start Supabase locally
cd supabase
supabase start

# Save the connection details shown in the output
```

### 4. Configure Environment Variables

#### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
PORT=3002
NODE_ENV=development
SUPABASE_URL=http://localhost:54330
SUPABASE_ANON_KEY=<from-supabase-start-output>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-start-output>
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:3003
CORS_ORIGIN=http://localhost:19006
```

#### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:3002
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54330
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-start-output>
EXPO_PUBLIC_AI_SERVICE_URL=http://localhost:3003
```

#### AI Service Configuration

```bash
cd ai-service
cp .env.example .env
```

Edit `ai-service/.env`:
```
PORT=3003
NODE_ENV=development
CORS_ORIGIN=http://localhost:19006
```

### 5. Run Database Migrations

```bash
cd supabase
supabase db reset
```

This will:
- Reset the database
- Run all migrations
- Seed initial data (admin user, sample products, tasks, stocks)

### 6. Start Development Servers

You'll need **3 terminal windows**:

#### Terminal 1 - Backend API
```bash
cd backend
npm run dev
```

Backend will run on http://localhost:3000

#### Terminal 2 - AI Service
```bash
cd ai-service
npm run dev
```

AI service will run on http://localhost:3001

#### Terminal 3 - Frontend (React Native)
```bash
cd frontend
npm start
```

Then:
- Press `t` to open tunnel mode (for testing on physical devices)
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your phone

## Default Admin Account

After running migrations, you can login with:

- **Email:** admin@HMall.com
- **Password:** admin123

**⚠️ IMPORTANT:** Change this password in production!

## Project Structure

```
HMall/
├── backend/          # Express API server
├── frontend/         # React Native Expo app
├── ai-service/       # AI recommendation service
├── supabase/         # Database migrations and config
└── docs/            # Documentation
```

## Development Workflow

### Making Database Changes

1. Create a new migration:
```bash
cd supabase
supabase migration new your_migration_name
```

2. Edit the migration file in `supabase/migrations/`

3. Apply migration:
```bash
supabase db reset  # Local
# or
supabase db push   # Remote
```

### Testing API Endpoints

Use tools like:
- Postman
- Insomnia
- curl
- httpie

Example:
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Building for Production

#### Backend
```bash
cd backend
npm run build
npm start
```

#### Frontend
```bash
cd frontend
# For Expo managed workflow
expo build:android
expo build:ios

# Or use EAS Build
eas build --platform android
eas build --platform ios
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

**Backend (3000):**
```bash
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>
```

**Supabase (54321):**
```bash
cd supabase
supabase stop
supabase start
```

### Database Connection Issues

1. Verify Supabase is running:
```bash
cd supabase
supabase status
```

2. Check `.env` files have correct credentials

3. Try resetting database:
```bash
supabase db reset
```

### Frontend Build Errors

1. Clear cache:
```bash
cd frontend
expo start -c
```

2. Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### Module Not Found Errors

1. Ensure all dependencies are installed:
```bash
npm run setup
```

2. Check import paths are correct

3. Restart development servers

## Environment-Specific Setup

### Development
- Uses local Supabase
- Hot reload enabled
- Detailed error messages
- Mock data available

### Staging
- Uses remote Supabase (staging project)
- Production-like environment
- Testing with real data

### Production
- Uses remote Supabase (production project)
- Optimized builds
- Error tracking
- Monitoring enabled

## Next Steps

1. **Read API Documentation** - Check backend routes for available endpoints
2. **Explore Frontend** - Navigate through app screens
3. **Test Features** - Try all user stories
4. **Customize** - Modify design, add features
5. **Deploy** - Follow deployment guides

## Additional Resources

- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Firebase Setup Guide](./FIREBASE_SETUP.md) (Optional)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [Express.js Documentation](https://expressjs.com/)

## Getting Help

- Check existing issues on GitHub
- Review documentation in `/docs` folder
- Check console logs for errors
- Verify environment variables are set correctly

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request


