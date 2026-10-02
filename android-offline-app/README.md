# EXPTRACK for Android

Offline expense tracker packaged with Capacitor. The Android app stores expenses and categories in a private SQLite database. All screens, scripts, icons, and fonts are bundled in the APK. Email registration and login use the HTTPS backend at https://expense-track-lovat.vercel.app and MongoDB Atlas. Expense tracking stays local and works offline after login.

## Install

Copy `dist/EXPTRACK-1.1.0.apk` to your phone and open it. Allow installation from your file manager if Android requests it.

Requires Android 7.0 (API 24) or newer and Android System WebView/Chrome 111 or newer. An outdated WebView shows an update instruction screen. Broad compatibility is targeted; performance on every Android device has not been verified.

Account profiles and bcrypt password hashes are stored in Atlas expense_tracker.users. Opaque server sessions are hashed in auth_sessions. Expense data stays on the device; cloud expense backup and synchronization are not implemented. Uninstalling or clearing app data removes the local records. Installing a newer APK signed with the same key preserves them.

## Features

- Create, edit, delete, and browse expenses by month.
- Today's total follows the device's local date, independent of the selected month.
- Amounts are stored as integer cents in SQLite.
- Default and custom categories, with protection against deleting categories in use.
- Persistent light/dark appearance, Android back handling, keyboard resize, and system-bar insets.
- Indexed database reads and batches of 60 rendered expense rows.

## Build

Use Node.js, JDK 21, Android SDK platform 36, and build-tools 36.0.0. Set `JAVA_HOME` and `ANDROID_HOME`, then run:

```powershell
npm ci
npm run android:build
```

The build script creates and verifies a signed release APK in `dist/`. Keep `.keys/exptrack-release.jks` and `.keys/release.json` safe: future updates require the same signing key. Both are excluded from Git. The debug build uses a separate application ID ending in `.debug`.

## Local development and checks

```powershell
npm run dev
npm run lint
npm run typecheck
npm run build
npm start
# In another terminal:
npm run check:accounts
```

The browser preview uses IndexedDB; Android uses SQLite through `ExpenseStorePlugin.java`. The preview server is for development, not an installed offline browser app.

`scripts/check-offline.mjs --native` runs the same workflows through an Android debug WebView forwarded to port 9222. Set `ANDROID_HOME` for back-button checks. Run it only on a fresh test installation. Results and screenshots go to `test-results/`.

The new account API is in src/app/api/auth/[action]/route.ts. Configure MONGODB_URI only in server environment variables. Android credentials use Keystore-backed AES-GCM storage; browser authentication uses an HTTP-only cookie. Sessions last 30 days. The first signed-in account keeps the pre-login local expenses; other accounts receive separate local databases. Sign-out preserves records for returning accounts. The web and mobile builds are separate: mobile export stages source without server routes. Original server routes and login screens are preserved in `archive/` for reference. They are excluded from the Android export. No remote synchronization has been added.
