# EXPTRACK 1.4.0 validation

Date: 2026-11-04. Android versionCode 7.

APK: dist/EXPTRACK-1.4.0.apk
SHA-256: b262217d1e795f9c3c771b80aba197e92824e70a775296580f3dd483ab431acb

## Behavior

Add money supports Salary, Loan received, Owed money repaid, Freelance, and Other money received, with amount/date/note and edit/delete. Available balance sums all received money minus spending through today's local date, independent of month navigation. Future entries do not affect current balance. Loans received add cash; outstanding debt and repayment schedules are not tracked.

Income categories use stable reserved UUIDs in the existing SQLite/IndexedDB categories and transaction stores. Amounts remain integer cents on Android and integer-cent sums in the interface. Existing expense records and outboxes are preserved without a database schema migration. Update all Android installations to 1.4.0 before using income: older versions do not distinguish income records from spending.

Dark mode now uses charcoal surfaces, subtle card shadows, single-pixel borders, readable text, and warm orange controls. Launch theme has an explicit cream window/icon background and disables Android Force Dark; the app itself still supports dark mode.

## Checks

- ESLint and TypeScript passed (one preexisting unused-disable warning in src/lib/db.ts). Mobile static build and release/debug Gradle builds passed. Release APK v2/v3 signing, forced legacy v1 verification, zip alignment and delivered-file hash checks passed. Signed 1.4.0 installed on Android 15/API 35.
- Clean npm ci and production build passed from the actual GitHub android-offline-app project directory. Vercel Root Directory confirmed android-offline-app; the root website tsconfig exclusion is preserved. npm audit --omit=dev returned zero vulnerabilities.
- Browser and native SQLite/WebView income checks: 20000 received minus 5000 spent gives 15000; reload persistence, income edit/delete, correct signs, month-independent balance, future-date exclusion, income-source choices, and narrow layout passed. Dark computed text and border checks passed, and screenshots were visually inspected.
- Live Android emulator + real Atlas backend + browser website test passed: offline salary and spending persisted through reload, uploaded after reconnection, and produced matching 15000 balances. Website salary edit returned to native; offline native salary deletion reached the website. Pending account A income remained isolated during account B login and uploaded on returning to A. Test accounts/cloud records were deleted afterward. Offline transport was simulated by aborting external API requests and dispatching connection state changes, preserving bundled app assets; this is not a physical radio-loss test.
- Browser and Android regression checks passed password visibility, list/grid persistence, totals, expense edit/delete and layout. Android daily 20:30 schedule, disable/re-enable, background delivery of a short-delay copy, icon payload, and logout cancellation passed. Evening delivery was not tested by waiting until 20:30.
- Real sync API tests passed account isolation, idempotent replay, create/edit/delete, aliases, concurrent category integrity and malformed/auth/origin rejection. The sync regression with AbortSignal.any unavailable passed.
- Google verifier and mocked browser Google sign-in checks passed. Real native Credential Manager bridge reached the expected recoverable missing-Play-services error. Successful Google account login cannot be verified on this emulator because it lacks Google Play services.
- Release cold-start frames captured with system night mode enabled show the cream startup window (test-results/cold-launch-1.png). The brief system logo splash was not isolated in those frames; the theme resource explicitly specifies cream for both the splash and icon backgrounds.

## Reproduce

Local preview: npm run dev -- --port 3005. Open http://localhost:3005.
Income interface: node scripts/check-income.mjs, with --native for the debug WebView at port 9325. Live native sync: node --env-file=.env.local scripts/check-native-income-sync.mjs, with the local site on port 3005 or INCOME_TEST_URL set to production. These tests use disposable or synthetic test accounts.

Screenshots and local evidence stay in test-results/. Signing keys, credentials, SDK/JDK files, caches and node_modules are excluded from publication.
