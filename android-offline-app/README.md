# EXPTRACK — developer guide

**[Download the latest Android app — v1.11.3](https://github.com/fakhrul62/expense-track/raw/refs/heads/main/android-offline-app/dist/EXPTRACK-1.11.3.apk)** · [Web app](https://expense-track-lovat.vercel.app) · [Project overview](https://github.com/fakhrul62/expense-track#readme)

EXPTRACK combines a Next.js web application and account/sync API with a Capacitor Android app. Android entries use private SQLite storage; the browser uses IndexedDB. Both sync an account's ledger through MongoDB Atlas.

This folder is the maintained application and the Vercel project root. From a repository clone, run the commands below inside `android-offline-app`.

## Local web development

Prerequisites: Node.js 24, npm and a MongoDB connection.

```bash
npm ci
cp .env.example .env.local
```

Configure these server environment variables:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Database connection for accounts, sessions and synced ledger records. |
| `GOOGLE_CLIENT_ID` | Web OAuth client ID used to verify Google sign-in. Required for the Google sign-in option. |

Never commit `.env.local` or expose database credentials through `NEXT_PUBLIC_*` variables. Follow [Google setup](GOOGLE-SETUP.md) for the Android package and signing-certificate requirements.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). The local browser app uses the local API; the packaged Android app targets the configured production API. Review `src/lib/account-client.ts` and `src/context/SyncContext.tsx` before distributing a fork with another backend.

## Build Android

The provided build script uses Windows PowerShell. Install JDK 21, Android SDK platform 36 and build-tools 36.0.0, then set `JAVA_HOME` and `ANDROID_HOME`.

```powershell
npm ci
npm run android:build
```

The script exports the mobile interface, syncs Capacitor, builds Android and verifies signing/alignment. Output goes to `dist/EXPTRACK-<version>.apk`, with a `.sha256` file and an updated `android-update.json` descriptor.

Preserve `.keys/exptrack-release.jks` and `.keys/release.json`: compatible updates require the same signing key. These files are excluded from Git. Debug builds use the separate `com.fakhrul.exptrack.debug` application ID.

Runtime requirements are Android 7.0/API 24 or newer and Android System WebView/Chrome 111 or newer. Native Google sign-in requires Google Play services. These are compatibility targets; the [validation record](VALIDATION-1.11.3.md) documents actual test coverage and limits.

## Checks

```bash
npm test
npm run typecheck
npx eslint src
npm run build
```

`npm test` covers wallet/report calculations, financial edge cases, Google-token verification and update-version eligibility. Browser journeys and Android WebView checks live in `scripts/`; read each script's server/device requirements before running it.

Real API integration checks require the local environment and a running API:

```bash
npm run test:sync
```

These checks create temporary accounts and use scoped cleanup. See [QC documentation](docs/qc/) for native SQLite, offline sync, lending, settings and update-indicator evidence.

## Storage and sync

- Android uses private SQLite storage; browser entry uses IndexedDB. Offline mutations are queued durably for the signed-in account.
- Cloud sync runs while the app is open, on reconnect/resume, and periodically while visible. It does not schedule uploads while the app is closed.
- Use the same account on Android and web to access synced data. **Config → Account** includes cloud sync status and a manual sync action.
- Signing out preserves local account records and cancels reminders. Uninstalling or clearing app data can remove unsynced changes.
- Concurrent edits to the same entry use the last change received by the server. Loan deletion and late-payment recovery have dedicated regression checks.
- Passwords are hashed with bcrypt. Browser sessions use HTTP-only cookies; Android session credentials use Keystore-backed encrypted storage.

## Deployment and updates

Configure Vercel's **Root Directory** as `android-offline-app`, set the server environment variables, and build with `npm run build`.

Android update checks read the public GitHub descriptor. A Config badge indicates a confirmed newer release; downloads and installation remain user-controlled. Publish the matching source, descriptor, signed APK and checksum together. See [the update and publishing guide](UPDATES.md).

Update the download links in both repository READMEs when publishing a new APK. Keep previous versioned artifacts unchanged.

## Release information

Current documented release: **v1.11.3 · Android code 21**.

It includes separate bank/cash wallets, Borrowed/Lent flows, installment collections and repayments, reports and exports, configurable reminders, coordinated themes/fonts, grouped settings, an update badge and the financial QC fixes.

[Release validation](VALIDATION-1.11.3.md) · [QC findings and fixes](docs/qc/) · [Google sign-in setup](GOOGLE-SETUP.md)
