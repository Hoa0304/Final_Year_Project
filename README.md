# HMall - Simulated E-commerce & Personal Finance Platform

## Overview

HMall is a comprehensive application for personal expense management combined with a simulated e-commerce platform using **ETH** as the simulated currency. The application allows users to manage simulated finances, browse and purchase products using simulated ETH, complete verification and action tasks to earn simulated ETH, and receive personalized AI suggestions for spending and budget optimization.

## Features

- **Simulated Currency Management**: View, earn, spend, and track virtual balances in ETH.
- **Simulated E-commerce Marketplace**: Browse, search, and purchase products using **ETH Wallet** (using virtual balance with a 10% discount) or **ETH Direct** (simulated direct transfer).
- **Task System**: Complete actions and verify tasks to earn simulated ETH.
- **AI Recommendation Engine**: Personalized recommendations for products, budgets, and spending optimizations.
- **Messaging & Chat**: Real-time communication and system help chat.
- **Vendor Dashboard**: Create a vendor shop, publish products, manage orders, and upgrade shop packages.
- **Admin Panel**: Comprehensive moderation tool to manage users, approve products, create tasks, and view vendor stats.

---

## Tech Stack

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **Data Fetching**: React Query / SWR
- **Local Storage**: AsyncStorage
- **Styling**: Vanilla Stylesheet (Premium HSL-based design system)

### Backend
- **Framework**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (JSON Web Tokens) with Auth Middleware
- **Services**: Custom notification and chat services

### AI Service
- **Engine**: Node.js Recommendation Engine (supports training models and budget optimization suggestions)

---

## Project Structure

```
HMall/
├── frontend/              # React Native Expo App
│   ├── src/
│   │   ├── screens/      # Screen layouts (Main, Admin, Vendor, Auth, Detail)
│   │   ├── components/   # Reusable UI elements
│   │   ├── navigation/   # Stack & Tab Navigators
│   │   ├── services/     # API Service connectors
│   │   ├── utils/        # Price and string utility helpers
│   │   └── types/        # TypeScript interfaces
│   └── package.json
├── backend/               # Express REST API Server
│   ├── src/
│   │   ├── routes/       # API Route paths
│   │   ├── controllers/  # API Controllers
│   │   ├── middleware/   # Express middleware (Auth, validation)
│   │   ├── services/     # Logic services (Transactions, notification)
│   │   └── utils/        # Generic utils
│   └── package.json
└── ai-service/            # AI recommendation service
    ├── src/
    │   └── recommendation/ # Recommendation logic
    └── package.json
```

---

## Prerequisites

- **Node.js**: version 18 or higher
- **npm** or **yarn**
- **Supabase CLI** (for local development database)
- **Expo CLI** (for running the mobile application)
- **ngrok** (optional, for testing the Expo client on physical mobile devices)

---

## Quick Start

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd HMall
```

### Step 2: Install Dependencies

Run the install commands in each service folder:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# AI Service
cd ../ai-service
npm install
```

### Step 3: Start Supabase Local Database

HMall uses Supabase CLI for database and authentication services.

```bash
cd supabase
supabase start
```

Save the credentials displayed in the terminal output:
- **anon key**
- **service_role key**
- **API URL**: http://localhost:54330

### Step 4: Configure Backend Environment Variables

Create a `backend/.env` file from the example:

```bash
cd ../backend
cp .env.example .env
```

Open `backend/.env` and replace the Supabase configuration details:

```env
PORT=3002
NODE_ENV=development

SUPABASE_URL=http://localhost:54330
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

JWT_SECRET=your-random-jwt-secret-key
JWT_EXPIRES_IN=7d

AI_SERVICE_URL=http://localhost:3003
CORS_ORIGIN=http://localhost:19006
```

### Step 5: Configure Frontend Environment Variables

Create a `frontend/.env` file:

```env
# If running on emulator/simulator:
EXPO_PUBLIC_API_URL=http://localhost:3002

# If running on a physical mobile device (requires ngrok URL):
# EXPO_PUBLIC_API_URL=https://your-ngrok-subdomain.ngrok-free.app
```

---

## Running the Application

Always start the services in the following order:

### 1. Supabase Local Database
```bash
cd supabase
supabase start
```
*Keep this terminal running.*

### 2. Express Backend API
```bash
cd backend
npm run dev
```
*API runs at http://localhost:3002.*

### 3. AI Service
```bash
cd ai-service
npm run dev
```
*AI service runs at http://localhost:3003. (First time training: run `npm run train`).*

### 4. Expo Frontend Client
```bash
cd frontend
npm run dev
```
Use the Expo Go app on iOS or Android to scan the QR code and test the interface.

---

## Setup ngrok for Physical Device Testing

If you are using a physical mobile device to run the app via Expo Go, you need to expose your local backend server:

1. **Install ngrok** (from https://ngrok.com)
2. **Start ngrok tunnel** for port 3002:
   ```bash
   ngrok http 3002
   ```
3. **Copy the HTTPS URL** (e.g., `https://abc123-xyz.ngrok-free.app`)
4. **Update `frontend/.env`**:
   ```env
   EXPO_PUBLIC_API_URL=https://abc123-xyz.ngrok-free.app
   ```
5. **Restart the Expo development server**:
   ```bash
   npm run dev -- --clear
   ```

---

## License

MIT
