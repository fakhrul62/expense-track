# EXPTRACK for Android

Expense tracker packaged with Capacitor. Android saves expenses and categories in private SQLite storage and syncs them with https://expense-track-lovat.vercel.app through MongoDB Atlas. Screens, scripts, icons, and fonts are bundled in the APK. Expense tracking works offline after login; queued changes upload when the app reconnects or reopens online.

## Install

Copy `dist/EXPTRACK-1.3.1.apk` to your phone and open it. Allow installation from your file manager if Android requests it. Install over the previous version to retain your local records.

Requires Android 7.0 (API 24) or newer and Android System WebView/Chrome 111 or newer. An outdated WebView shows an update instruction screen. Broad compatibility is targeted; performance on every Android device has not been verified.

Account profiles and bcrypt password hashes are stored in Atlas expense_tracker.users. Opaque server sessions are hashed in auth_sessions. Synced expenses and categories restore after signing into the same account. Uninstalling or clearing app data loses changes that have not synced. Installing a newer APK signed with the same key preserves local records.

## Features

- Create, edit, delete, and browse expenses by month.
- Sign in or sign up with Google, or use email and password. Native Google sign-in requires Google Play services.
- Automatic account-specific app/site sync, including edits and deletions. Offline changes persist across restarts. Sync runs while the app is open, on reconnect/resume, and every 30 seconds while visible; Settings also provides Sync now. Closed-app background uploads are not scheduled. For simultaneous edits, the last change received by the server wins.
- Show/hide the password on sign-in and registration.
- Switch daily entries between list and grid; the selected view stays saved on this device.
- Android daily spending notification around 8:30 PM local time, scheduled offline. Allow notifications after signing in; turn the reminder off/on in Settings. Signing out cancels it. Android battery restrictions can delay delivery. Background reminders are not available in the browser preview.
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

The account API is in src/app/api/auth/[action]/route.ts; cloud sync is in src/app/api/sync/route.ts. Configure MONGODB_URI and GOOGLE_CLIENT_ID on the server. Android credentials use Keystore-backed AES-GCM storage; browser authentication uses an HTTP-only cookie. Sessions last 30 days. The first signed-in account keeps the pre-login local expenses; other accounts receive separate local databases. Sign-out preserves records for returning accounts. Existing SQLite and IndexedDB databases migrate their records into the durable sync queue. The web and mobile builds are separate: mobile export stages source without server routes. Original server routes and login screens are preserved in `archive/` for reference and excluded from the Android export.

Google configuration is documented in GOOGLE-SETUP.md. Current release evidence is in VALIDATION-1.3.1.md; Google sign-in limitations are documented in VALIDATION-1.3.0.md.
