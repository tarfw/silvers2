# 🚀 READY TO RUN - Turso Tasks App

## ⚠️ CRITICAL: You Need Expo Dev Build!

**Expo Go will NOT work** with Turso React Native SDK!

The Turso SDK uses native C++ modules that require a **custom development build** (custom APK with native code compiled in).

> 📖 **Read**: [DEV_BUILD.md](DEV_BUILD.md) for detailed setup instructions

---

## ✅ Your Credentials (Already Configured!)

- **Supabase**: https://erkapwbrlflitysminxq.supabase.co
- **Turso**: libsql://tar-tarapp.aws-eu-west-1.turso.io

These are already set in `.env` file!

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd turso-tasks-app
npm install
```

### Step 2: Initialize Turso Database

**This is REQUIRED before running the app:**

```bash
# Create tables in your Turso database
turso db shell tar-tarapp < scripts/init-database.sql
```

### Step 3: Build Dev APK & Run

**Option A: EAS Cloud Build (Easiest - 10 minutes)**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Create development build
eas build --platform android --profile development

# Wait for email with download link (~5-10 min)
# Download APK, install on device
```

**Option B: Local Build (Faster - 3 minutes)**

```bash
# Requires Android Studio installed
npx expo prebuild --platform android
npx expo run:android
```

---

## 📱 Development Workflow

Once you have the dev build APK installed:

```bash
# 1. Start Metro bundler
npx expo start

# 2. Open the dev build app on your device
# It will automatically connect to Metro

# 3. Develop with hot reload!
```

---

## 🎯 Testing Checklist

- [ ] Sign up with email/password
- [ ] Create 3-5 tasks
- [ ] Toggle task completion
- [ ] Delete a task
- [ ] **Pull** to sync from cloud
- [ ] **Push** to sync to cloud
- [ ] Turn off WiFi, create task, turn on WiFi, sync
- [ ] Install on second device, login, verify sync works

---

## 🔧 What Was Built

### Project Structure:
```
turso-tasks-app/
├── .env                      # Your credentials ✓
├── App.tsx                   # Main entry point
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx  # Supabase auth
│   ├── lib/
│   │   ├── database.ts      # Turso sync manager
│   │   └── supabase.ts      # Supabase client
│   ├── hooks/
│   │   └── useTasks.ts      # CRUD + sync
│   ├── screens/
│   │   ├── AuthScreen.tsx   # Login/signup
│   │   └── TasksScreen.tsx  # Task list + sync
│   └── types/
│       └── index.ts         # TypeScript types
├── scripts/
│   ├── init-database.sql    # Turso schema
│   └── verify-setup.ts      # Connection test
└── docs/
    ├── DEV_BUILD.md         # Dev build guide
    ├── MIGRATION.md         # Self-hosted plan
    └── QUICKSTART.md        # Full guide
```

### Features Implemented:
- ✅ Supabase Auth (sign up/login)
- ✅ Turso Cloud sync (pull/push)
- ✅ Offline-first local database
- ✅ Task CRUD operations
- ✅ Multi-device sync
- ✅ User data isolation

---

## 💰 Cost Breakdown

### Current (Turso Cloud):
- **Free tier**: Up to 500 databases
- **Storage**: 9GB free
- **Sync**: First 5GB free
- **Your cost**: $0 for testing!

### Future (Self-Hosted):
- **Fly.io VM**: $5-20/month
- **Storage**: $0.15/GB
- **Cloudflare Workers**: Free tier
- **1000 users**: ~$20-50/month total
- **Savings**: 95% vs Turso Cloud per user pricing

---

## 📚 Documentation Files

1. **DEV_BUILD.md** - How to create development builds
2. **MIGRATION.md** - Plan for self-hosted migration
3. **QUICKSTART.md** - Full setup guide
4. **README.md** - Project overview

---

## 🆘 Troubleshooting

### "Expo Go can't find module"
**Solution**: You're using Expo Go instead of Dev Build. You MUST use a custom dev build APK.

### "Build failed"
**Solution**: Run `npx expo prebuild --clean` then rebuild

### "Can't connect to Metro"
**Solution**: Ensure device and computer on same WiFi, use `npx expo start --lan`

### "Turso sync not working"
**Solution**: 
1. Verify database initialized: `turso db shell tar-tarapp "SELECT * FROM sqlite_master"`
2. Check internet connection
3. Verify credentials in `.env`

---

## 🎉 You're Ready!

### Run these commands now:

```bash
cd turso-tasks-app
npm install
turso db shell tar-tarapp < scripts/init-database.sql
npm install -g eas-cli
eas login
eas build --platform android --profile development
```

Then:
1. Wait for the build email (5-10 minutes)
2. Download the APK
3. Install on your Android device
4. Run `npx expo start`
5. Open the app and test!

---

## 🔄 Next: Self-Hosted Migration

Once you've confirmed the app works:

We'll implement:
1. **Cloudflare Workers** - Namespace management API
2. **libSQL on Fly.io** - Self-hosted with namespace-per-user
3. **Cost reduction** - From $2/user to ~$0.02/user

See [MIGRATION.md](MIGRATION.md) for the full plan.

---

**Questions or issues? Let me know!** 🚀
