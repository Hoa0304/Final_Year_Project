# Environment Variables Setup

This file contains the environment variables you need to set up for each part of the project.

## Backend (.env)

Create `backend/.env` with the following content:

```
PORT=3002
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=http://localhost:54330
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# AI Service
AI_SERVICE_URL=http://localhost:3003

# CORS
CORS_ORIGIN=http://localhost:19006
```

**To get Supabase keys:**
1. Run `cd supabase && supabase start`
2. Copy the `anon key` and `service_role key` from the output
3. Replace the values in backend/.env

## Frontend (.env)

Create `frontend/.env` with the following content:

```
EXPO_PUBLIC_API_URL=http://localhost:3002
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54330
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_AI_SERVICE_URL=http://localhost:3003
```

**Note:** For Expo, environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

## AI Service (.env)

Create `ai-service/.env` with the following content:

```
PORT=3003
NODE_ENV=development
CORS_ORIGIN=http://localhost:19006
```

## Production Environment Variables

For production, update the URLs to point to your production servers:

- `SUPABASE_URL`: Your production Supabase project URL
- `EXPO_PUBLIC_API_URL`: Your production backend API URL
- `JWT_SECRET`: Use a strong, randomly generated secret
- `NODE_ENV`: Set to `production`

## Security Notes

1. **Never commit .env files** - They are already in .gitignore
2. **Use different secrets for each environment** (dev, staging, prod)
3. **Rotate secrets regularly** in production
4. **Keep service_role key secure** - Only use in backend, never expose to frontend

