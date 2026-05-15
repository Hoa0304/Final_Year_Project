# Firebase Setup Guide (Optional)

This guide covers setting up Firebase for realtime chat and push notifications in HMall.

## Prerequisites

- Firebase account (free tier available)
- Node.js and npm installed
- Firebase CLI (optional, for advanced usage)

## Step 1: Create Firebase Project

1. **Go to Firebase Console:**
   - Visit https://console.firebase.google.com
   - Sign in with your Google account

2. **Create a new project:**
   - Click "Add project"
   - Enter project name: `HMall` (or your preferred name)
   - Disable Google Analytics (optional)
   - Click "Create project"

3. **Wait for project creation** (takes a few seconds)

## Step 2: Enable Required Services

### Enable Realtime Database

1. In Firebase Console, go to **Realtime Database**
2. Click **Create Database**
3. Choose location (closest to your users)
4. Start in **test mode** (for development)
5. Click **Enable**

### Enable Cloud Messaging (FCM)

1. Go to **Project Settings** (gear icon)
2. Click **Cloud Messaging** tab
3. Note your **Server key** and **Sender ID** (you'll need these later)

### Enable Authentication (Optional)

If you want to use Firebase Auth alongside Supabase:

1. Go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** sign-in method

## Step 3: Install Firebase SDK

### Backend Installation

```bash
cd backend
npm install firebase-admin
```

### Frontend Installation

```bash
cd frontend
npm install firebase @react-native-firebase/app @react-native-firebase/messaging
```

For Expo, you may need:
```bash
npx expo install expo-notifications
```

## Step 4: Configure Firebase

### Backend Configuration

1. **Get Service Account Key:**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click **Generate new private key**
   - Save the JSON file securely (DO NOT commit to git)

2. **Create `backend/src/config/firebase.ts`:**
```typescript
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const firebaseAdmin = admin;
```

3. **Add to `.gitignore`:**
```
backend/src/config/serviceAccountKey.json
```

### Frontend Configuration

1. **Get Web App Config:**
   - Go to Firebase Console > Project Settings > General
   - Scroll to "Your apps" section
   - Click Web icon (`</>`)
   - Register app with nickname
   - Copy the config object

2. **Create `frontend/src/config/firebase.ts`:**
```typescript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const messaging = getMessaging(app);
```

## Step 5: Environment Variables

### Backend `.env`
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/serviceAccountKey.json
```

### Frontend `.env`
```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
```

## Step 6: Implement Realtime Chat (Example)

### Backend - Send Message
```typescript
import { firebaseAdmin } from '../config/firebase';

export async function sendChatMessage(userId: string, message: string) {
  const db = firebaseAdmin.database();
  const ref = db.ref('messages');
  
  await ref.push({
    userId,
    message,
    timestamp: Date.now(),
  });
}
```

### Frontend - Listen to Messages
```typescript
import { database } from '../config/firebase';
import { ref, onValue } from 'firebase/database';

export function listenToMessages(callback: (messages: any[]) => void) {
  const messagesRef = ref(database, 'messages');
  
  onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const messages = data ? Object.values(data) : [];
    callback(messages);
  });
}
```

## Step 7: Implement Push Notifications

### Backend - Send Notification
```typescript
import { firebaseAdmin } from '../config/firebase';

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string
) {
  const message = {
    notification: {
      title,
      body,
    },
    token: fcmToken,
  };

  try {
    const response = await firebaseAdmin.messaging().send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}
```

### Frontend - Request Permission and Get Token
```typescript
import * as Notifications from 'expo-notifications';
import { getToken } from 'firebase/messaging';
import { messaging } from '../config/firebase';

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status === 'granted') {
    const token = await getToken(messaging);
    // Send token to your backend to store
    return token;
  }
  
  return null;
}
```

## Security Rules

### Realtime Database Rules

Update rules in Firebase Console > Realtime Database > Rules:

```json
{
  "rules": {
    "messages": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "notifications": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## Troubleshooting

### FCM Token Issues
- Ensure app has notification permissions
- Check Firebase config is correct
- Verify device is registered

### Realtime Database Connection
- Check database URL in config
- Verify security rules allow access
- Check network connectivity

### Build Issues
- For Expo: May need to use EAS Build for native modules
- For bare React Native: Follow platform-specific setup

## Alternative: Use Supabase Realtime

If you prefer to use Supabase for everything:

1. Supabase has built-in Realtime subscriptions
2. Use Supabase Edge Functions for push notifications
3. Simpler setup, one less service to manage

See Supabase documentation for Realtime features.

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)



