# 🔨 Build Guide - Turso Tasks App

## ✅ What We've Completed

### 1. Project Setup
- ✅ Created Expo project with TypeScript
- ✅ Configured Supabase Auth with your credentials
- ✅ Configured Turso Cloud with your database
- ✅ Updated dependencies for React Native 0.76+ compatibility
- ✅ Installed Turso React Native SDK (v0.5.0-pre.5)
- ✅ Updated code to use new Turso API (Database class, getDbPath)

### 2. Prebuild Complete
- ✅ Generated native Android code
- ✅ Configured New Architecture (required by Turso SDK)
- ✅ Set minSdkVersion to 24
- ✅ Generated gradle files

## 🏗️ Current Status: Building APK

The Gradle build is in progress. First builds take 5-15 minutes as it downloads dependencies.

## 📋 Next Steps

### Step 1: Wait for Build to Complete

The build is running. You'll find the APK at:
```
turso-tasks-app/android/app/build/outputs/apk/debug/app-debug.apk
```

**If build fails**, common issues:
- **JAVA_HOME not set**: Install JDK 17 and set environment variable
- **Android SDK not found**: Install Android Studio and SDK
- **Memory issues**: Increase Gradle heap size in `gradle.properties`

### Step 2: Install APK on Device

Once built, install on your Android device:

```bash
# Option A: Using ADB (device connected via USB)
adb install turso-tasks-app/android/app/build/outputs/apk/debug/app-debug.apk

# Option B: Transfer APK to device and install manually
# Enable "Install from Unknown Sources" in Settings
```

### Step 3: Initialize Turso Database (CRITICAL!)

Before running the app, initialize your Turso database:

```bash
turso db shell tar-tarapp < turso-tasks-app/scripts/init-database.sql
```

Or manually:
```bash
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

### Step 4: Start Development Server

On your computer:

```bash
cd turso-tasks-app

# Start Metro bundler
npx expo start --lan

# Or with tunnel (for remote debugging)
npx expo start --tunnel
```

### Step 5: Connect Device

1. **Ensure device and computer are on same WiFi network**
2. Open the installed app on your device
3. The app will automatically connect to Metro
4. If not, shake device → "Change bundler location" → enter your computer's IP:8081

## 🔧 Troubleshooting

### "Could not resolve all dependencies"
```bash
cd turso-tasks-app/android
./gradlew clean
./gradlew assembleDebug
```

### "JAVA_HOME not set"
Install JDK 17:
- Windows: Download from Oracle or use OpenJDK
- macOS: `brew install openjdk@17`
- Linux: `sudo apt install openjdk-17-jdk`

Set environment variable:
```bash
export JAVA_HOME=/path/to/jdk-17
export PATH=$JAVA_HOME/bin:$PATH
```

### "Android SDK not found"
1. Install Android Studio
2. Open SDK Manager, install:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34
   - Android Emulator (optional)
3. Set ANDROID_HOME:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### App crashes on startup
Check Android logs:
```bash
adb logcat | grep -i "turso\|react\|error"
```

Common causes:
- Turso database not initialized
- Wrong credentials in .env
- Network permission not granted

### "Unable to connect to Metro"
1. Check firewall settings
2. Ensure same WiFi network
3. Try USB debugging instead
4. Check Metro is running on port 8081:
```bash
npx expo start --port 8081
```

## 🔄 Rebuilding (After Code Changes)

If you make changes to native code or add native modules:

```bash
# Clean and rebuild
cd turso-tasks-app
npx expo prebuild --clean --platform android
cd android
./gradlew assembleDebug
```

If only JS changes:
```bash
# Just reload in Metro (R key in terminal)
# Or shake device → Reload
```

## 📱 Development Workflow

### Daily Development:
```bash
# 1. Start Metro
cd turso-tasks-app
npx expo start --lan

# 2. Open app on device (already installed)
# 3. Make code changes → Auto reloads
# 4. Test sync features
```

### Testing Sync:
1. Create task (works offline)
2. Press "Push" button
3. Check Turso dashboard to verify data
4. Install on second device
5. Login and Pull
6. Verify task appears

## 🎯 Quick Commands Reference

```bash
# Build debug APK
cd turso-tasks-app/android && ./gradlew assembleDebug

# Install on device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Start Metro
npx expo start

# View logs
adb logcat | grep ReactNative

# Clean build
./gradlew clean

# Release build
./gradlew assembleRelease
```

## 📊 Project Structure (Post-Build)

```
turso-tasks-app/
├── android/              # Generated native code ✓
│   ├── app/
│   │   └── build/outputs/apk/debug/app-debug.apk
│   ├── build.gradle
│   └── gradlew
├── src/                  # Your TypeScript code
├── App.tsx              # Entry point
├── .env                 # Your credentials
└── node_modules/        # Dependencies ✓
```

## 🚀 What Works Now

Once you complete the build:
- ✅ Sign up/login with Supabase
- ✅ Create tasks offline
- ✅ Sync with Turso Cloud (Push/Pull)
- ✅ Multi-device sync
- ✅ Offline-first architecture

## ⚠️ Important Reminders

1. **Dev Build Required**: Cannot use Expo Go
2. **New Architecture**: Enabled (required by Turso)
3. **Initialize DB First**: Run SQL before testing
4. **Same WiFi**: For wireless debugging
5. **Debug APK**: For development (not for production)

## 🆘 Need Help?

If build fails:
1. Check error logs carefully
2. Ensure Android SDK and JDK 17 installed
3. Try `cd android && ./gradlew clean` then rebuild
4. Check Turso Discord or GitHub issues

**Build in progress... Check back in 5-10 minutes for APK!**
