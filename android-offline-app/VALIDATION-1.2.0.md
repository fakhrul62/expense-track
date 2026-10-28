# EXPTRACK 1.2.0 validation

- ESLint passed with one existing unused-disable warning in src/lib/db.ts. TypeScript and production web/mobile builds passed.
- Browser at 320, 360 and 768 px: show/hide on sign-in and registration; unchanged password value; list/grid selection survives reload; daily totals stay consistent; editing and deleting work in grid; no horizontal overflow or JavaScript errors.
- Android 15/API 35 debug WebView: the same UI workflows passed. Verified one recurring reminder with hour 20/minute 30, cancellation when disabled, disabled preference after reload, re-enabling, and cancellation on sign-out.
- A short-delay test notification delivered while the Android app was in the background. The 8:30 PM daily schedule was inspected, not tested by waiting until evening. Android battery restrictions can delay actual evening delivery.
- Account responses in feature tests were mocked; no production account writes were made. Previous live account verification is in VALIDATION.md.
- Signed release 1.2.0/versionCode 4 upgrade installation succeeded on Android 10/API 29 and Android 15/API 35. Android 10 launch succeeded.
- APK v2/v3 and forced legacy v1 verification, zip alignment, and delivered-file hash verification passed.

APK: dist/EXPTRACK-1.2.0.apk
SHA-256: 88906cde880bc21e18bca8fa37b6e9e1424d332e4285852bccf180850a23c4bc

Run `node scripts/check-daily-features.mjs` against `npm run preview:mobile` for browser feature checks. Add `--native` for a fresh Android debug test installation with WebView debugging forwarded to port 9222, notification permission granted, ANDROID_HOME set and ANDROID_TEST_DEVICE identifying the emulator (defaults to emulator-5556).
