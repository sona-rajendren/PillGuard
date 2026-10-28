#!/usr/bin/env bash
# One-time setup: generates android/ios folders around the existing lib/ + pubspec.yaml
set -e
cd "$(dirname "$0")"
flutter create . --project-name pillguard --org com.presidency --platforms=android,ios
flutter pub get

MAN=android/app/src/main/AndroidManifest.xml
if ! grep -q "USE_BIOMETRIC" "$MAN"; then
  sed -i 's#<application#<uses-permission android:name="android.permission.INTERNET"/>\n    <uses-permission android:name="android.permission.CAMERA"/>\n    <uses-permission android:name="android.permission.USE_BIOMETRIC"/>\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>\n    <application#' "$MAN"
  # allow plain-http API during local development
  sed -i 's#<application#<application android:usesCleartextTraffic="true"#' "$MAN"
fi
# local_auth needs FlutterFragmentActivity
find android -name 'MainActivity.*' -exec sed -i 's/FlutterActivity/FlutterFragmentActivity/g' {} +
echo "Done. Also see mobile/README.md (desugaring + iOS plist keys)."
