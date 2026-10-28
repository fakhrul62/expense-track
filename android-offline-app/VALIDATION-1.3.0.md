# EXPTRACK 1.3.0 validation

Signed release: dist/EXPTRACK-1.3.0.apk, versionCode 5.

SHA-256: a0059418d693495969e2def19938a3e405669234fb3f36c7d2e476b1aeb297c1

## Build and delivery

- TypeScript, ESLint, production Next build, mobile static export and Android release/debug builds passed. ESLint reports one preexisting unused-disable warning in src/lib/db.ts.
- APK signature verification passed for v2/v3 and forced legacy v1; zip alignment and delivered-file hash checks passed.
- Release upgrade installation succeeded on Android 10/API 29 and Android 15/API 35. The app launched after upgrade on both.
- Production deployment dpl_DtWBC8qacZvtHxZ9V5VeUyhFMbz5 was confirmed Ready with https://expense-track-lovat.vercel.app attached.

## Google sign-in

- Web OAuth and Android release/debug package/certificate clients configured in Google Cloud; consent app published In production. Public client IDs are in GOOGLE-SETUP.md.
- Real Google Identity Services button loads on the production website. The user confirmed that website Google sign-in works.
- Google token verifier tests passed for signature, issuer, audience, expiry, single-use nonce inputs, verified email and authoritative email linking rules. Browser Google button/callback tests passed using mocked provider responses.
- Android native button successfully invokes Credential Manager. The test emulator lacks Google Play services and shows the expected recoverable error. A successful native Google credential exchange has not been verified on a Google Play enabled device; do not treat the emulator bridge check as a completed Google account login.

## Cloud sync

- Real Atlas API tests passed: create/edit/delete, idempotent mutation replay, stale replay after deletion, category aliases, concurrent category deletion/expense creation, account isolation, invalid-payload rejection, authentication and origin enforcement.
- Real production Android debug WebView and Brave website test passed: existing SQLite records preserved and queued by migration; offline entry saved and preserved through reload; reconnect uploaded to the live website; website amount edit returned to Android; offline deletion reached the website; unsynced account A records were retained during account B login and uploaded only when returning to A.
- Offline network testing blocks the app's external backend requests and overrides online state while retaining bundled assets. Emulator radio controls alone do not reliably remove its reported connection. This test verifies the durable queue and reconnect behavior; it is not a physical radio loss test.
- Existing browser IndexedDB v1 expense and custom category were preserved, migrated and uploaded to the live service.
- Device sync test reported no browser or WebView JavaScript errors. Screenshots: test-results/android-cloud-sync.png and test-results/site-cloud-sync.png.
- Disposable production test accounts and their cloud data were removed after tests.

Sync occurs while the app is open, on reconnection/resume, and every 30 seconds while visible. Changes saved while the app is closed upload after reopening online. For competing edits the server accepts the last change it receives. Pending local edits are preserved during incoming merges; deleted records and mutation IDs are retained server-side to prevent stale retries from resurrecting entries.

Password visibility, list/grid view and the 8:30 PM Android reminder remain included. Earlier feature verification and reminder timing limitations are documented in VALIDATION-1.2.0.md.

## Repeatable checks

Run scripts/check-google-verifier.mjs and scripts/check-google-ui.mjs for Google checks. For live sync checks, set MONGODB_URI through .env.local and run Node with --env-file=.env.local against scripts/check-sync-api.mjs or scripts/check-browser-migration.mjs. The API test uses a local production server on port 3001. scripts/check-app-cloud-sync.mjs requires ANDROID_HOME, the debug app on the emulator, and its WebView forwarded to port 9222. These live tests create and remove disposable accounts; they must not be run against a user's debug account database.
