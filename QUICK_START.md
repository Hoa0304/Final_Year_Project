# Quick Start Guide

Get HMall up and running in 5 minutes!

## Prerequisites Check

- [ ] Node.js v18+ installed
- [ ] Docker Desktop installed and running
- [ ] Git installed

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm run setup
```

### 2. Start Supabase

```bash
cd supabase
supabase start
```

**IMPORTANT:** Copy the output values (anon key, service_role key, URLs)

### 3. Configure Environment

#### Backend
```bash
cd backend
# Create .env file (see ENV_SETUP.md for template)
# Add Supabase credentials from step 2
```

#### Frontend
```bash
cd frontend
# Create .env file (see ENV_SETUP.md for template)
# Add Supabase credentials from step 2
```

### 4. Run Migrations

```bash
cd supabase
supabase db reset
```

### 5. Create Admin User

Option A - Using script:
```bash
cd backend
node scripts/create-admin.js
# Follow prompts, then run the generated SQL in Supabase Studio
```

Option B - Manual:
1. Register via app (any email/password)
2. Go to Supabase Studio (http://localhost:54332)
3. Find your user in `users` table
4. Update `role` to `'admin'`

### 6. Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - AI Service:**
```bash
cd ai-service
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm start
# Press 't' for tunnel mode
```

### 7. Test the App

1. Open Expo Go app on your phone
2. Scan QR code from terminal
3. Register a new account or login as admin
4. Start exploring!

## Default Credentials

After creating admin user:
- Email: admin@HMall.com (or your chosen email)
- Password: (the one you set)

## Troubleshooting

### Supabase won't start
- Ensure Docker Desktop is running
- Check ports 54330-54336 are free (changed from 54321-54327)
- Try: `supabase stop` then `supabase start`

### Can't connect to API
- Verify backend is running on port 3002 (changed from 3000)
- Check EXPO_PUBLIC_API_URL in frontend/.env
- Ensure CORS_ORIGIN in backend/.env matches Expo URL

### Database errors
- Run `supabase db reset` to reset database
- Check Supabase is running: `supabase status`

## Next Steps

- Read [README.md](./README.md) for full documentation
- Check [docs/SETUP.md](./docs/SETUP.md) for detailed setup
- Review [GIAI_THICH_CODE.txt](./GIAI_THICH_CODE.txt) for code explanation (Vietnamese)

## Need Help?

- Check the troubleshooting section in [docs/SETUP.md](./docs/SETUP.md)
- Review error messages in console
- Verify all environment variables are set correctly


