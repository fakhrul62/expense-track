# EXPTRACK 1.3.1 validation

Date: 2026-10-28. Android versionCode 6.

APK: dist/EXPTRACK-1.3.1.apk

SHA-256: 977f6c426793018d311e64d0088b706b987f1878567abb89153e8efee55c8838

## Fixes

- The daily reminder now includes the EXPTRACK color logo as its large icon. Its small status icon is opaque white artwork on transparency, supplied as PNGs for all five Android screen densities. Capacitor also has a default small icon and brand accent color. Existing reminders refresh when the updated app opens.
- Replaced AbortSignal.any with an AbortController, explicit timeout and cleanup. Some supported Android WebViews lack AbortSignal.any, which previously prevented their cloud sync requests.
- Updated Next.js and eslint-config-next to 16.4.3; sharp to 0.35.5; source-map-js to 1.2.2; patched development dependencies brace-expansion, js-yaml and zod. npm audit --omit=dev reports zero vulnerabilities. The complete audit still reports three moderate findings in the development-only Capacitor CLI -> xcode -> uuid chain; no forced incompatible CLI replacement was made.

## Verification

- ESLint passed with the existing unused-disable warning in src/lib/db.ts. TypeScript, the Next production build, the mobile export and Android release/debug builds passed with the updated dependencies.
- APK v2/v3 verification, forced legacy v1 verification, zip alignment and delivered-file SHA-256 checks passed. The release APK installed successfully over version 1.3.0 on the Android 15/API 35 emulator, preserving the package signing identity.
- Browser and Android WebView: password show/hide, list/grid persistence, daily totals, edit/delete and responsive layout passed. Android: one daily alarm at 20:30, disable/re-enable persistence, background delivery and sign-out cancellation passed.
- Inspected the actual persisted Android daily notification payload for smallIcon, largeIcon and iconColor. A short-delay copy of that payload delivered in the background. Android dumpsys confirmed a small resource icon and a decoded bitmap logo. Screenshots were visually inspected in light and dark system themes: test-results/notification-light-1.3.1.png and test-results/notification-dark-1.3.1.png. Short-delay test notifications were removed after inspection. The test verifies delivery and appearance; it does not wait until 8:30 PM.
- Sync compatibility regression passed with AbortSignal.any explicitly unavailable: initial synchronization and expense upload both completed against a mocked service.
- Real Atlas-backed sync API tests passed against the updated local production server: account isolation, create/edit/delete, category aliases, idempotent retries, stale retries after deletion, concurrent category integrity, malformed inputs and origin/authentication rejection. Disposable test accounts were removed.
- Existing IndexedDB v1 expense and custom category migration/upload passed against the live service before the dependency-only update.
- Google button sign-in/sign-up tests, failed-token recovery, session persistence, logout and nonce exchange passed with mocked Google responses. Signed token verifier tests passed. Real native Google account login remains unverified because the emulator has no Google Play services; this release does not change that integration.
- Automatic approval review rejected the command for another live Android-to-website sync test with "blocked by policy". That end-to-end test was not rerun in this review. Earlier successful live device/site sync coverage is in VALIDATION-1.3.0.md; current API, offline device and compatibility results are listed above.

## Publication

The updated app source, validation notes and signed APK are published inside the existing android-offline-app/ GitHub folder. Repository-root website files are preserved. This publication updates that app folder; it is not a deployment of the server dependency updates to the production website.

The native icon resources are source assets; no image-generation service is used. Signing keys, environment files with credentials, SDK/JDK installations and caches are excluded from publication.

Relevant upstream advisories: [Next.js Windows server RCE](https://github.com/advisories/GHSA-p293-qw3h-jr36), [Next.js typed-array cache RCE](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [sharp dependency vulnerabilities](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
