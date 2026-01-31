# Quick Start Guide - Your App is Ready!

## ✅ Pre-Configured Credentials

Your environment is already set up with:
- **Supabase Project**: erkapwbrlflitysminxq
- **Turso Database**: tar-tarapp (eu-west-1 region)

## 🚀 Steps to Run

### 1. Install Dependencies
```bash
cd turso-tasks-app
npm install
```

### 2. Initialize Turso Database (First Time Only)
```bash
# Connect to your Turso database and run the schema
turso db shell tar-tarapp < scripts/init-database.sql
```

Or manually run these SQL commands in the Turso shell:
```sql
turso db shell tar-tarapp

CREATE TABLE IF NOT EXISTS tasks (
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
.exit
```

### 3. Verify Setup (Optional but Recommended)
```bash
# Add ts-node for running TypeScript scripts
npm install --save-dev ts-node

# Run verification script
npx ts-node scripts/verify-setup.ts
```

### 4. Start the App
```bash
# Start Expo development server
npx expo start

# Press 'a' to open on Android emulator/device
# Or scan QR code with Expo Go app on your phone
```

## 📱 Using the App

### First Time Setup
1. **Sign Up**: Create an account with email/password
2. **Verify Email**: Check your email (if enabled in Supabase)
3. **Start Adding Tasks**: Create, complete, and delete tasks

### Sync Features
- **Pull**: Downloads latest changes from cloud
- **Push**: Uploads local changes to cloud
- **Works Offline**: Create tasks without internet, sync later
- **Multi-device**: Use same account on multiple devices

## 🔧 Troubleshooting

### "Invalid API key" or connection errors
- Verify you're using the correct `.env` file
- Restart Expo server after any env changes

### "Table not found" errors
- Run the SQL initialization script (Step 2 above)

### App crashes on start
- Make sure you're using React Native 0.73+ with New Architecture
- Check that all dependencies installed correctly

## 🎯 Next Steps

Once you've tested the app and confirmed sync works:

1. ✅ **Test offline functionality**: Turn off wifi, create tasks, turn on wifi, sync
2. ✅ **Test multi-device**: Install on 2 devices, sync between them
3. 🔄 **Ready for Step 2**: We'll implement self-hosted architecture

## 💰 Current Costs (Turso Cloud)

- **Database**: Included in free tier (up to 500 databases)
- **Storage**: 9GB free
- **Sync**: First 5GB egress free
- **Cost**: $0 for testing, ~$2/month per DB if you exceed free tier

**Note**: When you have many users, we'll migrate to self-hosted to reduce costs to ~$20-50/month total instead of $2 per user.

---

**Ready to test? Run `npx expo start` and try creating your first task!**
