# OMNI TRACKER — Native Android Floating Assistant

## Architectural Overview & Security Boundary

### Why Native Android is Required for System-Wide Overlays
Standard web browsers and Progressive Web Apps (PWAs) run inside the Android browser security sandbox. Modern mobile operating systems strictly prohibit web applications from rendering pixels outside the browser viewport or above third-party applications (e.g. Google Maps, Ride Sharing apps, Messaging).

To achieve a true **system-wide floating handle** that remains accessible while using any other Android application, Android requires a native `Service` holding the `SYSTEM_ALERT_WINDOW` permission and utilizing `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY`.

---

## Component Architecture

```
android/
├── app/
│   ├── build.gradle.kts                   # Modern Gradle Kotlin DSL configuration
│   └── src/main/
│       ├── AndroidManifest.xml            # Overlay & Foreground Service declarations
│       └── java/com/omnitracker/app/
│           ├── overlay/
│           │   ├── OmniOverlayService.kt     # Draggable WindowManager overlay service
│           │   └── OverlayPermissionHelper.kt# Permission request & recovery helper
│           ├── ui/
│           │   └── QuickCaptureActivity.kt   # Translucent rapid-entry bottom sheet
│           └── bridge/
│               └── DataSyncBridge.kt         # Secure JSON sync journal bridge
```

---

## Required Android Permissions

1. **`android.permission.SYSTEM_ALERT_WINDOW`**:
   - Required to draw floating windows over other running apps.
   - Must be granted explicitly by the user via *Settings > Apps > Special app access > Display over other apps*.

2. **`android.permission.FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_SPECIAL_USE`** (Android 14+ / API 34):
   - Keeps the overlay process alive in background memory so Android does not kill the handle during long commutes.
   - Shows a persistent low-priority system notification with quick actions to hide or reopen the assistant.

3. **`android.permission.POST_NOTIFICATIONS`** (Android 13+ / API 33):
   - Required to show the foreground service notification.

---

## Data Synchronization Bridge (`DataSyncBridge.kt`)

1. **Deterministic Record IDs**:
   - Expenses: `exp_native_<timestamp>_<random>`
   - Habit completions: `hcomp_native_<timestamp>_<random>`
2. **Persistence**:
   - Logged entries are written atomically to a secure local file `omni_native_sync_journal.json` in the app's internal sandbox (`/data/user/0/com.omnitracker.app/files/`).
3. **Synchronization with Web App / IndexedDB**:
   - When the user launches OMNI TRACKER, the app ingests the journal entries into IndexedDB.
   - The existing `SyncService` pushes these records to OneDrive Excel without duplicate creation.
4. **Security**:
   - Zero private credentials or tokens are exposed to the overlay service.

---

## How to Build and Run in Android Studio

1. **Prerequisites**:
   - Android Studio Hedgehog (2023.1.1) or newer
   - JDK 17
   - Android SDK API 34 (Android 14)

2. **Steps**:
   ```bash
   # Clone or open the /android directory in Android Studio
   cd android
   # Build debug APK
   ./gradlew assembleDebug
   ```

3. **Install on Device via ADB**:
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Grant Overlay Permission**:
   - When launching the app, tap **Enable Floating Assistant**.
   - Android will navigate to *Display over other apps*. Toggle **Allow display over other apps** to ON.

5. **Manufacturer Battery Optimizations**:
   - On Xiaomi (MIUI/HyperOS): Enable *Autostart* and set Battery Saver to *No restrictions*.
   - On Samsung (One UI): Add OMNI TRACKER to *Never sleeping apps*.
