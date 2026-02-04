# Silvers - Setup Instructions

> ⚡ **Quick Start**: Your credentials are already configured! See [QUICKSTART.md](QUICKSTART.md) for immediate testing.

## Overview

This is an Expo React Native app with:
- **Supabase Auth** for user authentication
- **Turso Cloud** for managed database with sync
- **Offline-first** architecture with bidirectional sync

## ✅ Pre-Configured for You

**Supabase**: https://erkapwbrlflitysminxq.supabase.co  
**Turso**: libsql://tar-tarapp.aws-eu-west-1.turso.io

Credentials are already set in `.env` file!

## Prerequisites

1. Node.js 18+ installed
2. Expo CLI: `npm install -g expo-cli`
3. Android Studio or physical Android device

## Quick Start (3 Steps)

```bash
# 1. Install dependencies
cd turso-tasks-app
npm install

# 2. Initialize Turso database (one-time)
turso db shell tar-tarapp < scripts/init-database.sql

# 3. Run the app
npx expo start
```

## Detailed Setup (If Needed)

### Environment Setup

Create a `.env` file in the root directory (already done for you):

```env
# Supabase Configuration
# Get these from your Supabase project dashboard -> Project Settings -> API
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Turso Configuration  
# Get these from Turso CLI: turso db show your-db-name --url
EXPO_PUBLIC_TURSO_URL=libsql://your-db-name-your-username.turso.io
EXPO_PUBLIC_TURSO_TOKEN=your-auth-token
```

## Step 2: Supabase Setup

### 2.1 Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Copy the Project URL and Anon Key

### 2.2 Configure Auth
1. In Supabase Dashboard -> Authentication -> Settings
2. Enable Email provider
3. Disable "Confirm email" for easier testing (optional)
4. Set Site URL to your app scheme: `com.yourcompany.tursotasks://`

## Step 3: Turso Setup

### 3.1 Install Turso CLI
```bash
curl -sSfL https://get.turso.tech/install.sh | bash
```

### 3.2 Create Database
```bash
# Login to Turso
turso auth login

# Create a database for the app
turso db create turso-tasks-app

# Get the connection URL
turso db show turso-tasks-app --url

# Create an auth token
turso db tokens create turso-tasks-app
```

### 3.3 Configure Database Schema
```bash
# Connect to database shell
turso db shell turso-tasks-app

# Create tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 1,
  due_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
```

## Step 4: Install Dependencies

```bash
cd turso-tasks-app
npm install
```

## Step 5: Run the App

### Android Development
```bash
# Start Expo development server
npx expo start

# In another terminal, press 'a' to open Android
# Or scan QR code with Expo Go app
```

### iOS Development (if on macOS)
```bash
npx expo start
# Press 'i' to open iOS simulator
```

## How It Works

### Authentication Flow
1. User signs up/logs in via Supabase Auth
2. App receives JWT token from Supabase
3. User ID extracted from token
4. Database initialized with user-specific local DB name

### Data Flow
```
User creates task in app
    ↓
Stored in local libSQL database (offline)
    ↓
User clicks "Push" or auto-sync triggers
    ↓
Local changes pushed to Turso Cloud
    ↓
Available on all user's devices
```

### Sync Architecture
- **Pull**: Downloads remote changes to local DB
- **Push**: Uploads local changes to remote DB
- **Bidirectional**: Changes sync both ways
- **Conflict resolution**: Last-write-wins (Turso default)

## Testing Sync

1. **Create task** on Device A (offline mode if needed)
2. **Push** changes
3. Open app on **Device B**
4. **Pull** changes
5. Task should appear on Device B

## Next Steps

Once this is working:
1. ✅ Test multi-device sync
2. ✅ Verify offline functionality
3. 🔄 Move to Step 2: Self-hosted libSQL with namespace-per-user

## Troubleshooting

### "Turso credentials not configured"
- Check `.env` file exists with correct variables
- Restart Expo server after changing `.env`

### "Auth session not found"
- Verify Supabase URL and Anon Key are correct
- Check Supabase Auth is enabled in dashboard

### Sync fails
- Check internet connection
- Verify Turso token hasn't expired
- Check Turso database exists and is accessible

## Architecture Decisions

**Why Supabase Auth?**
- Easy integration with React Native
- Built-in user management
- JWT tokens for secure auth

**Why Turso Cloud first?**
- Validate architecture before self-hosting
- Managed sync infrastructure
- Easy to migrate to self-hosted later

**Why separate local DB per user?**
- Complete data isolation
- Easy user switching
- Clean data on logout
