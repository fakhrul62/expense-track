# EXPTRACK 1.11.3 release validation

Android version code 21. This cumulative patch includes the v1.11.1 QC fixes, v1.11.2 Borrowed/Lent funding selection, and v1.11.3 Config update indicator and grouped settings.

## Verified before publication

- Production website build, Android export/build, TypeScript and ESLint passed.
- `npm test` passed wallet/report arithmetic, QC edge cases, signed Google-token verification and update-version eligibility.
- Real API/Atlas tests passed account isolation/auth/sync and financial conflict regressions: case-insensitive income reservation, unsafe alias protection, orphan repayment recovery in both upload orders, retries, same-batch ordering and recovery deletion.
- Real Android SQLite/local production API integration passed two-way offline sync and Borrowed/Lent funding flows. Lending deducts only the selected wallet; partial/full collections reduce receivables and credit the chosen wallet. Deletion restores the appropriate balances.
- Browser responsive/appearance/wallet tests passed. Config tabs default to Updates and work at 320/390/900 widths with accessible keyboard navigation and isolated visible panels.
- Android update-indicator fixtures passed newer/current/older/failed/installed states, quiet startup detection, cooldown/deduplication, no automatic download/install, manual approval handoff and stale-candidate revalidation.
- Actual native startup checking against GitHub was verified in the release emulator. Native wallet and reminder regressions passed, including 1/3/6 daily schedules, reload persistence, replacement, off/on and logout cancellation.
- Signed release installed in place in the emulator. APK v2/v3 signatures verified; signing identity is retained from prior releases. Descriptor and artifact SHA-256 match.

APK: `dist/EXPTRACK-1.11.3.apk`

SHA-256: `840c5b32ddb9a7bd2632c1348fd94a912d2b41235ef9bbab48b44f9f0e8fc979`

Details: `docs/qc/2026-11-14-full-qc.md`, `2026-11-14-fixes.md`, `2026-11-14-lending.md`, and `2026-11-14-settings-updates.md`.

## Limits

Interactive Google success was not retested on the AOSP emulator, which lacks Google Play services. Actual Android installer approval, physical printing, minimum-API runtime coverage and OEM/Doze reminder soak tests remain outside this run's verified scope. Updater fixture responses were synthetic only inside the debug WebView; no fake release was published. Integration accounts used scoped cleanup.
