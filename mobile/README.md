# PillGuard — Flutter mobile app

Patient: today's doses, local reminders, blister-photo confirmation, vitals logging, drug-interaction checker, pill identifier.
Caregiver / Doctor: linked patients, adherence %, alert inbox (polled every 45 s, shown as on-device notifications).
All roles: biometric app lock (re-locks when backgrounded) and JWT stored in secure storage.

## Setup
```bash
cd mobile
./setup.sh            # runs `flutter create .`, patches the Android manifest and MainActivity
```
Manual checks after setup:
1. `android/app/build.gradle(.kts)` → inside `compileOptions` set `isCoreLibraryDesugaringEnabled = true` and add
   `coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")` to dependencies (required by flutter_local_notifications).
2. iOS only: add to `ios/Runner/Info.plist` → `NSCameraUsageDescription`, `NSFaceIDUsageDescription`.

## Run
```bash
# Android emulator (10.0.2.2 = your computer)
flutter run
# Physical phone on same Wi-Fi: use your PC's LAN IP
flutter run --dart-define=API_URL=http://192.168.1.10:5000/api
# Deployed API
flutter run --dart-define=API_URL=https://your-api.onrender.com/api
```
## Build APK
```bash
flutter build apk --release --dart-define=API_URL=https://your-api.onrender.com/api
# output: build/app/outputs/flutter-apk/app-release.apk
```
