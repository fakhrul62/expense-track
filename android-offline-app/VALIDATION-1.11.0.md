# EXPTRACK 1.11.0 — wallets, reports and appearance

Originally prepared as a local review build. The user subsequently requested another verification pass and publication to GitHub. The previous published version was 1.10.0 at 7a28a5853d0deb413c018ec95e102c72513c41de.

## Behavior
Bank/card and cash are separate. All amounts use integer cents. Source tags are stored in versioned note metadata so SQLite, IndexedDB and the unchanged sync protocol retain the tag; ordinary UI notes and exports decode it. Existing Bank Balance entries map to bank; other untagged entries map to cash. No records are duplicated or silently moved. New expenses default to cash. Income destination, per-row batch source, expense editing, loan receipt and repayments support both sources. Loan received is omitted from Add Money and guarded from generic income saving.

Home removes combined available balance and lifetime Received/Spent. Daily/monthly spending and date-group spending exclude income; future spending is excluded from the monthly actual total. Each transaction identifies its source. Loans uses one borrowing form and Active/Cleared/All; old lending records and payments remain accessible without recreating an Owed to Me workflow. Tracking-only debts do not change wallets. Confirmed loan deletion removes linked payments and recalculates both balances.

Reports supports Daily, Monday–Sunday Weekly, Monthly and Custom periods. Income, expenses and net cash flow, daily/monthly trends and category breakdowns follow the selected inclusive dates and exclude future/tracking-only debt. These are actual cash movements, including opening funds and loan movements, not accounting profit. CSV uses quoted cells and neutralizes formula prefixes. Native Android uses ACTION_CREATE_DOCUMENT without broad storage permissions; printing uses the Android print service and Save as PDF. HTML escapes user text and blocks WebView network loads.

Appearance presets Studio, Paper, Garden, Ink and Retro pair bundled fonts with palettes/card shapes; font override and light/dark remain device preferences. No proprietary Arial/Calibri binaries are distributed.

## Evidence
- scripts/check-wallet-math.mjs: legacy sources, cash defaults, source metadata, loan sources, cent arithmetic, Monday weeks/year boundaries/leap dates/custom validation, CSV escaping/formula handling and printable HTML escaping passed.
- scripts/check-report-math.mjs: prior-month opening, future exclusions, existing-debt exclusions, empty/month validation and cents passed.
- scripts/check-wallet-ui.mjs: browser IndexedDB financial/report/theme journey passed, including a real CSV download. Native SQLite final financial journey passed, including selected-source verification before saving and a future entry in the current month.
- Native review found a focus/scroll interaction dropping a batch-source tap. Payment-source buttons now prevent pointer focus changes before click, and the batch footer shows per-wallet totals. The regression asserts selected source before save and then verifies actual persisted wallet totals.
- Native CSV was saved using the Android document picker, pulled back and parsed: income 25,600.00, expenses 1,500.00, sources and readable notes matched; internal note envelopes were absent.
- Android print preview was visually inspected, Save as PDF produced a 62,461-byte two-page PDF, and extracted text verified income 25,600.00, expenses 1,500.00 and Bank Balance category.
- TypeScript, targeted ESLint, signed release/debug build, signature/alignment checks and matching update metadata passed. Final APK is dist/EXPTRACK-1.11.0.apk, Android code 18; SHA-256 c360239c3bf6328fee432afdd910ca99abdedd244e8ee137f5c7621740e9de07.

## Limits
Financial UI tests isolate synthetic accounts and simulate cloud transport; native tests exercise actual SQLite. Production account data is not modified by these tests. Older app versions preserve source tags via sync but display a combined balance and may display raw metadata notes until updated. Historical source is unknowable for untagged entries except Bank Balance, so cash is the documented fallback and ordinary entries can be reclassified in Edit. Printing was tested using Android Save as PDF, not a physical printer.

Final visual checks: Android number pad, fixed modal header/Add Another, native file picker, print preview, Ink/Paper appearance cards, source-tagged wallets and report figures were inspected. Final appearance-only build also matches Android bar backgrounds to the selected look, survives reinstall over the test app, and retains the tested SQLite balances. Responsive Home/Reports/Config/Loans checks passed at 320/390/900px. Browser checks confirm actual palette colors, card radii and matching fonts.

Delivery installation: final signed release installed successfully over the existing Android app; package com.fakhrul.exptrack reports versionName 1.11.0 / versionCode 18. Existing demo entries remained intact, and real Cloud Sync showed synced without financial test writes. Studio was selected in Config and the app was left on Home in the visible EXPTRACK - Android window. A release screenshot caught a light-theme monthly-total contrast issue; it was corrected and the responsive appearance test now asserts monthly text color for every modern theme.

Publication preflight (2026-11-11): another native SQLite wallet/UI journey passed on the final debug build, with simulated cloud transport. Pure wallet/report math, TypeScript, targeted ESLint, 320/390/900px layout/palette/monthly-text contrast checks and the staged production website build passed. The signed APK reverified with v2/v3 signatures and its descriptor checksum matched. Only android-offline-app paths were staged; credentials and local build data were excluded.
