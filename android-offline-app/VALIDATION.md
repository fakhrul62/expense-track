# Account login validation — EXPTRACK 1.1.0

Production backend: https://expense-track-lovat.vercel.app
Deployment: expense-track-6oc2k07ck-fakhrul-alams-projects.vercel.app
Vercel status: Ready, production alias attached.

Validated against the supplied Atlas expense_tracker database:
- Registration persists profiles in users with bcrypt hashes, never plaintext passwords.
- Email normalization, duplicate protection, wrong-password rejection, invalid input/Mongo operator rejection, allowed Android CORS and blocked external origin.
- Random sessions persist as hashes in auth_sessions; me validates expiry and logout revokes sessions.
- Disposable test accounts/sessions were removed after validation.

Production browser checks passed:
- Registration, sign-in, sign-out and login to a returning account.
- Separate IndexedDB storage for two accounts; one cannot see the other's expense.
- Mobile layout without horizontal overflow.

Android debug app on Android 15/API 35 with WebView 124:
- Registration/login against production Atlas backend.
- Encrypted session persistence; preferences contain neither email nor password in plaintext.
- With Wi-Fi and data disabled: saved session restored after reload, expense creation worked, logout worked, fresh login gave an internet-required message.
- Two-account SQLite isolation and return to the first account's saved records passed.
- No JavaScript errors.

Final signed release installer:
- APK v2/v3 verification plus forced legacy v1 verification passed; alignment and delivered-file hash checked.
- Android 10/API 29: normal Files app installer displayed App installed for 1.1.0.
- Android 10 and 15 ADB upgrade installations passed without test-only flags.
- Android 15 release cold launch passed.
- Bundled HTML/JS scan found no supplied Mongo URI, host or password.

APK: dist/EXPTRACK-1.1.0.apk
Bytes: 4189444
SHA-256: 0d41c2892d043e3eb93e5e8e64eded79dfae758ad8b573af00f96f15b07ef9b0

Accounts are stored remotely; expenses remain local. Cloud expense backup/sync and email verification/password reset are not implemented. Sessions expire after 30 days. The first signed-in account inherits previous offline records. Uninstalling/clearing app data deletes local expenses. Physical Redmi 9 behavior has not been verified.
