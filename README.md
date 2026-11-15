# EXPTRACK

Personal finance for Android and the web. Track everyday spending, manage cash and bank balances, and keep borrowing and lending clear—all in a focused interface with a distinctive retro style.

**[Download the latest Android app — v1.11.3](https://github.com/fakhrul62/expense-track/raw/refs/heads/main/android-offline-app/dist/EXPTRACK-1.11.3.apk)**

[Open the web app](https://expense-track-lovat.vercel.app) · [Installation](#install-on-android) · [Developer guide](android-offline-app/README.md) · [Release notes and validation](android-offline-app/VALIDATION-1.11.3.md)

Android 7.0+ · Android System WebView 111+ · Direct APK installation

## Your money, in one place

EXPTRACK helps you answer three everyday questions: where your money went, how much you have in each balance, and what you owe or are owed. Use the Android app for offline entry and the website to access the same synced account.

| Feature | What you can do |
| --- | --- |
| **Cash and bank balances** | See separate balances. Choose where income arrives and which balance pays an expense; expenses default to cash. |
| **Income and expenses** | Add income, record multiple expenses together, edit mistakes, and browse daily entries in list or grid view. |
| **Loans and receivables** | Record money borrowed or lent. Select Cash Balance or Bank Balance, track installments, clear a loan, and delete mistaken records. |
| **Reports** | Compare income and expenses by day, week, month or custom dates. View charts and category breakdowns; export CSV or print/save a PDF. |
| **Spending reminders** | Set one to six daily reminder times on Android. |
| **Personal appearance** | Choose coordinated themes and fonts, with light and dark modes. |
| **App updates** | See a subtle badge on Config when a newer Android version is available, then choose when to download and install it. |

Borrowing and lending totals stay separate from available money. Actual money received, lent, repaid or collected changes the selected cash or bank balance. Existing debts and receivables can be recorded without counting an old money movement again.

## Install on Android

1. [Download EXPTRACK v1.11.3](https://github.com/fakhrul62/expense-track/raw/refs/heads/main/android-offline-app/dist/EXPTRACK-1.11.3.apk).
2. Open the APK on your phone. If prompted, allow installation from the browser or file manager you used.
3. Sign in with Google or create an email/password account.

Install updates over your existing app to retain local records. Future updates are available in **Config → Updates**, with Android asking for installation approval.

Google sign-in on Android requires Google Play services. See the [APK checksum](android-offline-app/dist/EXPTRACK-1.11.3.apk.sha256) and [update details](android-offline-app/UPDATES.md).

## Offline entry and account sync

After signing in, the Android app stores entries in private SQLite storage and works offline. Pending changes sync with your account when the app is open and connected, including after reconnecting or resuming. Sign in with the same account on the website to see synced records.

Keep unsynced entries on the device: uninstalling the app or clearing its data can remove changes that have not reached the server. Closed-app background uploads are not scheduled. [More about storage and sync](android-offline-app/README.md#storage-and-sync).

## Built with

| Layer | Technology |
| --- | --- |
| Web interface and API | Next.js 16, React 19, TypeScript |
| Styling and interaction | Tailwind CSS 4, Framer Motion, Lucide |
| Android application | Capacitor 8, native Android integrations, SQLite |
| Browser storage | IndexedDB |
| Cloud data | MongoDB Atlas, accessed through Mongoose's database connection |
| Sign-in | Google or email/password; server-managed sessions and bcrypt password hashing |
| Web hosting | Vercel |

## Run the web app locally

Use Node.js 24 and npm, plus a MongoDB connection for the account and sync API.

```bash
git clone https://github.com/fakhrul62/expense-track.git
cd expense-track/android-offline-app
npm ci
cp .env.example .env.local
```

Set `MONGODB_URI` in `.env.local`. Set `GOOGLE_CLIENT_ID` to enable Google sign-in; see [Google setup](android-offline-app/GOOGLE-SETUP.md). Keep these settings on the server.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). For Android builds, signing, tests and deployment settings, use the [developer guide](android-offline-app/README.md).

## Repository guide

The maintained Android app, web app and API are in **[`android-offline-app/`](android-offline-app/)**. Vercel uses this folder as its project root.

- [`src/`](android-offline-app/src/) — interface, account API, local ledger and sync logic.
- [`android/`](android-offline-app/android/) — native Android project and integrations.
- [`dist/`](android-offline-app/dist/) — versioned signed APKs and checksums.
- [`scripts/`](android-offline-app/scripts/) — build tools and regression checks.
- [`docs/qc/`](android-offline-app/docs/qc/) — QC findings, fixes and test scope.

Earlier website files are retained at the repository root. Start in `android-offline-app` for current development.

Maintained by [Md. Fakhrul Alam Shuvo](https://github.com/fakhrul62).
