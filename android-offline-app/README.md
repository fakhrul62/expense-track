# EXPTRACK for Android

Expense tracker packaged with Capacitor. Android saves expenses and categories in private SQLite storage and syncs them with https://expense-track-lovat.vercel.app through MongoDB Atlas. Screens, scripts, icons, and fonts are bundled in the APK. Expense tracking works offline after login; queued changes upload when the app reconnects or reopens online.

## Install

Copy `dist/EXPTRACK-1.11.3.apk` to your phone and open it. Allow installation from your file manager if Android requests it. Install over the previous version to retain your local records.

Requires Android 7.0 (API 24) or newer and Android System WebView/Chrome 111 or newer. An outdated WebView shows an update instruction screen. Broad compatibility is targeted; performance on every Android device has not been verified.

Account profiles and bcrypt password hashes are stored in Atlas expense_tracker.users. Opaque server sessions are hashed in auth_sessions. Synced expenses and categories restore after signing into the same account. Uninstalling or clearing app data loses changes that have not synced. Installing a newer APK signed with the same key preserves local records.

## Version 1.11.3

- Loans offer Borrowed and Lent, with Cash Balance or Bank Balance as the source/destination. Debt and receivables have separate totals; installment/full collections, repayments and confirmed deletion retain their wallet effects.
- Config opens on Updates, followed by Appearance, Reminders, Account and Categories tabs. A subtle Config badge signals a confirmed newer Android release. Quiet checks run on startup/resume/reconnection with an hourly cooldown; downloading and installation remain explicit.
- QC fixes protect income/expense category identity, recover orphaned loan payments into editable standalone entries, harden CSV export, improve modal focus and report contrast, and group loan payments efficiently. Patched dependencies and regression tests are included.

## Features

- Add money: Salary, Bank Balance, Owed money repaid, Freelance and Other. Choose bank/card or cash as the destination. Record borrowing on Loans rather than Add Money.
- Separate bank/card and cash balances carry across months. Expenses default to cash; each entry can choose its source. Future entries are shown in their month but excluded from current balances and actual spending totals. Loans support partial/full payments and confirmed deletion; existing debt can be tracked without changing money balances.
- Income uses reserved stable category identities in the existing transactional SQLite/IndexedDB storage and cloud outbox. No destructive database migration is needed. Update all Android installations to 1.11.3 for consistent wallet display and decoded payment-source notes.
- Live interface preview: run npm run dev -- --port 3005 and open http://localhost:3005.

- Create, edit, delete, and browse expenses by month.
- Sign in or sign up with Google, or use email and password. Native Google sign-in requires Google Play services.
- Automatic account-specific app/site sync, including edits and deletions. Offline changes persist across restarts. Sync runs while the app is open, on reconnect/resume, and every 30 seconds while visible; Settings also provides Sync now. Closed-app background uploads are not scheduled. For simultaneous edits, the last change received by the server wins.
- Show/hide the password on sign-in and registration.
- Switch daily entries between list and grid; the selected view stays saved on this device.
- Android spending reminders at 1–6 user-selected daily times, scheduled offline (8:30 PM by default). Allow notifications after signing in; configure times or turn reminders off in Config. Signing out cancels it. Android battery restrictions can delay delivery. Background reminders are not available in the browser preview.
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

Google configuration is documented in GOOGLE-SETUP.md. Current release evidence is in VALIDATION-1.11.3.md; Google sign-in limitations are documented in VALIDATION-1.3.0.md.


## Version 1.11.0
Separate bank/card and cash wallets use versioned source tags in ledger notes, so existing SQLite/IndexedDB schemas and older sync servers retain the tag without lossy field stripping. Legacy Bank Balance entries map to bank and other untagged entries map to cash. New spending defaults to cash; edits preserve source. Loan cash movements also carry their source. Main totals show spending only.

Reports supports daily, Monday–Sunday weeks, monthly and custom dates, with CSV and native Android document saving/print-to-PDF. Config appearance presets pair bundled fonts with colors and card styles. See VALIDATION-1.11.0.md for checks and known compatibility limits.
