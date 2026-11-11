# Wallets, Reports and Appearance Implementation Plan

**Goal:** Separate bank/card and cash, simplify debt entry, provide useful reports and coordinated appearance presets. Local review only; no commit or push.

**Architecture:** Keep the existing positive-value synced ledger. Versioned note metadata carries payment source without changing native/cloud schemas or losing source tags when an older server syncs. Legacy Bank Balance entries map to bank; all other untagged movements map to cash. Notes shown/edited/exported are decoded. Loan metadata also carries source. Existing lending records remain accessible and repayable, while new loans are borrowing only.

**Tech Stack:** Next/React, Capacitor Java plugins, SQLite/IndexedDB, bundled fonts.

- [x] Add pure source tagging/balance arithmetic; preserve legacy entries, input validation, batch/edit, income destinations and loan payments.
- [x] Replace dashboard balance/lifetime figures with two wallet cards; keep daily/monthly spending.
- [x] Simplify loans to Active/Cleared/All, one borrowing form; preserve historical lending and deletion.
- [x] Build daily/weekly/monthly/custom reports, clear metrics/charts/category breakdown, CSV export and native print/PDF.
- [x] Add coordinated Retro/Paper/Mint/Ink themes, bundled matching fonts and optional font override; light/dark accessibility.
- [x] Run arithmetic and regression journeys in Android SQLite, inspect layouts/keyboard/exports/print/relaunch, build signed 1.11.0 APK and install for review.

## Checks
Integer cents, legacy source fallback, cross-wallet edits, mixed-source batches, future/tracking-only exclusions, period boundaries (Monday weeks), CSV escaping/formula safety, canceled export, small screens/notch/keyboard, saved theme/font and light/dark, historical lending preservation, no publication changes.
