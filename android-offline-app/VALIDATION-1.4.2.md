# EXPTRACK 1.4.2 typography correction

Android versionCode 9. Available balance now uses Space Mono and the same weight as the daily/monthly totals, with tabular numerals and safe wrapping. Received/spent figures use the same numeric family beneath their labels. No balance calculations or persistence behavior changed.

Checked rendered computed font-family and font-weight against both daily/monthly totals after fonts loaded. All matched Space Mono. Checked light and dark mode at 320, 360 and 768 px with an actual 20000 income entry; no horizontal overflow. Screenshots were visually inspected. TypeScript and mobile export passed. Android release/debug builds and signing/alignment verification are run by scripts/build-android.ps1; the delivered SHA-256 is recorded alongside the APK.
