# Drugucopia — Tauri Mobile App

This is the mobile (and desktop) native version of [Drugucopia](https://drugucopia.github.io), built with [Tauri v2](https://v2.tauri.app/).

## What Changed

The existing Next.js web app has been wrapped with Tauri v2 to produce native mobile (Android/iOS) and desktop applications with **native push notification support**.

### Files Added

| File | Purpose |
|------|---------|
| `src-tauri/Cargo.toml` | Rust project config with `tauri-plugin-notification` |
| `src-tauri/build.rs` | Tauri build script |
| `src-tauri/tauri.conf.json` | Tauri app config (window size, plugins, build commands) |
| `src-tauri/src/main.rs` | Desktop entry point |
| `src-tauri/src/lib.rs` | Shared lib — registers notification plugin |
| `src-tauri/capabilities/default.json` | Permission grants for notifications |
| `src-tauri/icons/*` | App icons for all platforms |
| `src/lib/tauri-bridge.ts` | Runtime detection + unified notification API |

### Files Modified

| File | Change |
|------|--------|
| `package.json` | Added `@tauri-apps/api`, `@tauri-apps/plugin-notification`, `@tauri-apps/cli`, Tauri scripts |
| `src/lib/notification-utils.ts` | Delegates to `tauri-bridge.ts` for Tauri-native notifications |
| `src/components/reminder-provider.tsx` | Skips SW registration + web sound in Tauri; async permission check |
| `src/store/reminder-store.ts` | Skips web sound when Tauri provides OS notification sound |

### Notification Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Reminder System                        │
│                                                          │
│  reminder-store.tick()                                   │
│       │                                                  │
│       ▼                                                  │
│  showBrowserNotification()  (notification-utils.ts)      │
│       │                                                  │
│       ▼                                                  │
│  tauri-bridge.showNotification()                         │
│       │                                                  │
│       ├── [Tauri Runtime]                                │
│       │   └── @tauri-apps/plugin-notification            │
│       │       └── Native OS notification (with sound)    │
│       │                                                  │
│       └── [Web Runtime]                                  │
│           ├── Service Worker → browser notification      │
│           └── Fallback: new Notification()               │
│                                                          │
│  Sound:                                                  │
│   [Tauri] OS notification sound (automatic)              │
│   [Web]   notification.wav via Web Audio API             │
└──────────────────────────────────────────────────────────┘
```

The `tauri-bridge.ts` module uses `window.__TAURI_INTERNALS__` to detect whether the app is running inside a Tauri webview. All notification calls are automatically routed to the appropriate backend with zero code changes when switching between platforms.

## Prerequisites

### All Platforms
- [Node.js](https://nodejs.org/) 18+ and npm
- [Rust](https://rustup.rs/) (stable toolchain)
- Tauri system dependencies — see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Android
- [Android Studio](https://developer.android.com/studio)
- Android SDK (API level 33+)
- Android NDK (r25c+)
- Java JDK 17

### iOS (macOS only)
- [Xcode](https://developer.apple.com/xcode/) 15+
- iOS 15+ deployment target
- CocoaPods

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Desktop development

```bash
npm run tauri:dev
```

This starts the Next.js dev server on port 3000 and opens the Tauri desktop window.

### 3. Android development

```bash
# One-time: initialize the Android project
npm run tauri:android:init

# Run on device/emulator
npm run tauri:android:dev

# Build release APK
npm run tauri:android:build
```

### 4. iOS development (macOS only)

```bash
# One-time: initialize the iOS project
npm run tauri:ios:init

# Run on device/simulator
npm run tauri:ios:dev

# Build release IPA
npm run tauri:ios:build
```

## Build for Production

### Desktop
```bash
npm run tauri:build
```

Outputs:
- **macOS**: `src-tauri/target/release/bundle/dmg/Drugucopia_0.2.0_aarch64.dmg`
- **Windows**: `src-tauri/target/release/bundle/msi/Drugucopia_0.2.0_x64_en-US.msi`
- **Linux**: `src-tauri/target/release/bundle/deb/drugucopia_0.2.0_amd64.deb`

### Android
```bash
npm run tauri:android:build
```

Outputs:
- `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`
- `src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab`

### iOS
```bash
npm run tauri:ios:build
```

Outputs:
- `src-tauri/gen/apple/Release/iphoneos/Drugucopia.ipa`

## Configuration

### Tauri Config (`src-tauri/tauri.conf.json`)

Key settings:
- **`build.frontendDist`**: Points to `../out` (Next.js static export)
- **`build.beforeBuildCommand`**: Runs `npm run build` (Next.js static export)
- **`plugins.notification`**: Enables the notification plugin
- **`app.windows[0]`**: Default window is mobile-sized (430×932 = iPhone 14 Pro Max)

### Capabilities (`src-tauri/capabilities/default.json`)

Grants the app:
- `notification:default` — Basic notification permission
- `notification:allow-notify` — Send notifications
- `notification:allow-is-permission-granted` — Check permission status
- `notification:allow-request-permission` — Request permission from user

## Android Notification Setup

Android requires a notification channel for reminders to appear properly. The Tauri notification plugin creates a default channel automatically. If you need to customize the channel (sound, vibration, importance), add this to `src-tauri/gen/android/app/src/main/AndroidManifest.xml` after running `tauri android init`:

```xml
<!-- Inside <application> tag -->
<meta-data
    android:name="com.tauri.notification.DEFAULT_CHANNEL_ID"
    android:value="reminders" />
<meta-data
    android:name="com.tauri.notification.DEFAULT_CHANNEL_NAME"
    android:value="Reminders" />
<meta-data
    android:name="com.tauri.notification.DEFAULT_CHANNEL_DESCRIPTION"
    android:value="Dose reminder notifications" />
```

## iOS Notification Setup

iOS notifications work out of the box. The permission request (`requestPermission()`) triggers the system prompt. For background notifications, ensure "Push Notifications" and "Background Modes > Remote Notifications" capabilities are enabled in the Xcode project after running `tauri ios init`.

## Web App Compatibility

The web app (PWA) continues to work exactly as before. The `tauri-bridge.ts` module only activates when `window.__TAURI_INTERNALS__` is present, so:
- **In a browser**: Uses `Notification` API + Service Worker
- **In Tauri desktop**: Uses native OS notifications
- **In Tauri mobile**: Uses native Android/iOS notifications

No feature flags or build-time switches are needed.

## Troubleshooting

### `@tauri-apps/plugin-notification` not found
Make sure you ran `npm install`. The package is listed in `dependencies` and is lazy-loaded by `tauri-bridge.ts` so it won't crash the web build if missing.

### Android: Notifications don't appear
1. Check that notification permission was granted (the app should prompt on first use)
2. Verify the notification channel exists in Android Settings > Apps > Drugucopia > Notifications
3. Make sure the app is not in "Do Not Disturb" mode

### iOS: Notifications don't appear
1. Check Settings > Drugucopia > Notifications is enabled
2. The app must be in the foreground for local notifications to appear (iOS limitation for debug builds)
3. For background notifications, ensure the "Push Notifications" capability is enabled in Xcode

### Next.js static export issues
The `next.config.ts` uses `output: 'export'` which generates static HTML in the `out/` directory. Tauri serves these files via `frontendDist: "../out"`. If you change the output directory, update both `next.config.ts` and `tauri.conf.json`.

## License

GNU Affero General Public License v3.0 — see [LICENSE](./LICENSE)
