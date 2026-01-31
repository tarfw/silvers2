# Expo Dev Build Setup Guide

> ⚠️ **IMPORTANT**: Turso React Native SDK requires a **custom development build**. It will NOT work with Expo Go!

## Why Expo Go Won't Work

The Turso React Native SDK (`@tursodatabase/sync-react-native`) uses:
- **Native modules** with C++ JSI bridge
- **Custom native code** for database operations
- **JNI bindings** for Android

Expo Go only supports libraries included in the Expo SDK. For custom native modules, you need a **development build**.

## What is a Dev Build?

A custom APK that includes:
- All native code from your dependencies
- Turso native modules compiled in
- Your specific app configuration

## Setup Options

### Option A: EAS Build (Recommended - Cloud)

Build in the cloud using Expo's EAS service:

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Configure project (creates eas.json)
eas build:configure

# 4. Create development build
eas build --platform android --profile development

# 5. Download and install APK on device
# Build will appear at: https://expo.dev/accounts/[username]/builds
```

**Pros**:
- No need for Android Studio
- Builds in cloud (5-10 minutes)
- Easy to share with team

**Cons**:
- Requires Expo account
- Free tier: 30 builds/month

### Option B: Local Build (Faster iteration)

Build on your machine:

```bash
# Prerequisites:
# - Android Studio installed
# - Android SDK configured
# - JAVA_HOME set

# 1. Prebuild native code
npx expo prebuild --platform android

# 2. Build debug APK
npx expo run:android

# Or build release APK directly:
cd android
./gradlew assembleRelease
# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

**Pros**:
- No build limits
- Faster iteration (2-3 minutes)
- Full control over build

**Cons**:
- Requires Android Studio setup
- Only builds on your machine

### Option C: EAS Local Build (Best of both)

Use EAS build system locally:

```bash
# Build locally using EAS
npx eas build --platform android --profile development --local

# APK will be created locally
```

## Quick Start (Option A - EAS Cloud)

### Step 1: Install Dependencies

```bash
cd turso-tasks-app
npm install
```

### Step 2: Setup EAS

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Initialize EAS for this project
eas build:configure
```

### Step 3: Update eas.json (Already Done)

Your project already has `eas.json` configured for development builds.

### Step 4: Build Development APK

```bash
# Create development build (includes dev client)
eas build --platform android --profile development

# Wait for build to complete (~5-10 minutes)
# You'll get a URL to download the APK
```

### Step 5: Install and Run

1. Download APK from the provided URL
2. Transfer to your Android device
3. Install APK (allow "Unknown sources" if prompted)
4. Open the app - it will have a developer menu
5. Metro bundler will connect automatically

### Step 6: Development Workflow

```bash
# Start Metro bundler
npx expo start

# The dev build app will connect to Metro
# You get:
# - Fast refresh (hot reload)
# - Developer menu (shake device)
# - Native debugging
```

## Development vs Production Builds

### Development Build
- Includes `expo-dev-client`
- Shows developer menu
- Connects to Metro bundler
- Larger APK size (~50MB)
- **Use for**: Development & testing

### Production Build
- No developer menu
- Optimized, smaller size
- Standalone app
- **Use for**: App store release

## Troubleshooting

### "Build failed: Native module not found"
- Make sure you ran `npx expo prebuild` before local build
- For EAS: Clean build with `eas build --clear-cache`

### "Unable to connect to Metro"
- Check device and computer are on same WiFi
- Try: `npx expo start --lan`
- Check firewall settings

### "App crashes on startup"
- Check Android Logcat: `adb logcat`
- Verify native modules are linked
- Rebuild: `npx expo prebuild --clean && npx expo run:android`

### "Turso SDK not working"
- Verify you're using **development build**, not Expo Go
- Check package.json has `expo-dev-client`
- Native modules only work in custom builds

## Development Workflow

Once you have the dev build installed:

```bash
# 1. Start Metro
cd turso-tasks-app
npx expo start

# 2. Open dev build app on device
# It auto-connects to Metro

# 3. Make changes in code
# Hot reload updates instantly

# 4. Test sync features
# Create task → Push → Check Turso dashboard

# 5. Shake device for dev menu
# Reload, toggle debugging, etc.
```

## Building for Production

When ready to release:

```bash
# Create production build
eas build --platform android --profile production

# Or local production build
npx expo prebuild --clean
npx expo run:android --variant release
```

## Cost

- **EAS Free Tier**: 30 builds/month (sufficient for development)
- **Local Build**: Free, but requires Android Studio setup
- **Time**: Cloud builds ~5-10 min, local builds ~2-3 min

## Summary

| Method | Setup Time | Build Time | Best For |
|--------|-----------|-----------|----------|
| EAS Cloud | 5 min | 10 min | Beginners, team sharing |
| Local Build | 30 min | 3 min | Power users, frequent builds |
| EAS Local | 10 min | 5 min | CI/CD, automation |

**Recommendation**: Start with EAS Cloud (easiest), switch to local builds if you hit the 30 build limit.

---

## Next Steps

1. ✅ Run `npm install` to install dependencies
2. ✅ Run `npm install -g eas-cli` to install EAS
3. ✅ Run `eas login` and `eas build:configure`
4. ✅ Run `eas build --platform android --profile development`
5. 🔄 Wait for build, download APK, install on device
6. 🔄 Run `npx expo start` to start development
7. 🔄 Test the app with Turso sync

**Ready to build? Let me know if you need help with the EAS setup!**
