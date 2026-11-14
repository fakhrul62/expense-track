# Config update indicator and grouped settings

Release v1.11.3, Android code 21. The checks below were performed locally before publication.

Config now has a small downward-arrow badge when Android confirms a strictly newer app version. It is shown on both mobile bottom navigation and desktop Config navigation. Viewing settings does not dismiss it; updating to a current/newer version clears it. Web clients do not display an Android update badge.

The authenticated Android app reads cached update state on startup and resume. While online it checks silently at startup, on resume/reconnection, and periodically, with an hourly success cooldown and a short failure backoff. Checks are deduplicated and serialized against download/installation operations. The explicit install action re-reads native state after waiting for an in-flight check so it does not use stale readiness. Background check failures stay quiet and preserve known availability. There is no automatic download, installation or system notification.

Config opens on Updates, first in the tab row. Other settings are grouped into Appearance, Reminders, Account and Categories. Appearance includes theme/font controls; Account includes account, device guidance and cloud sync. Only the selected panel is visible. Panels stay mounted to preserve drafts/progress. Tabs support arrows, Home/End, selected/focus state and linked panel names.

## Verified

- Browser grouping checks: first/default Updates panel; exactly one visible panel; keyboard tabs; category creation; appearance persistence; account and sync access; no horizontal page overflow at 320, 390 and 900 pixels.
- Browser wallet and responsive appearance regressions passed after updating the test navigation for tabs.
- Android SQLite wallet regression passed with the grouped settings. Native reminder tests passed 1/3/6 chosen times, duplicate rejection, alarm replacement, persistence after reload, off/on and cancellation on logout.
- Actual Android WebView/SQLite with controlled AppUpdater bridge responses: Home startup check without visiting Config; available badge and accessible label; hourly cooldown/repeated-event dedup; current/older/newer/failed/installed cases; no unsolicited download/install; explicit download/install action; reminder drafts preserved across tabs; account/category panels accessible.
- Updater fixtures use synthetic metadata only inside the debug WebView. No fake release is published and no APK is downloaded/installed by this fixture. The underlying signature/hash/package verifier is unchanged.
- Pure update-policy tests reject equal, older, missing, malformed and unconfirmed versions. Wallet/report/QC/Google-verifier suites, TypeScript, ESLint, production website build and signed Android build passed. Reminder scheduling regression passed.
- The signed release was installed in place in the emulator. The real native startup check reached the public repository, correctly recognized the installed v1.11.3 as newer than the published release, and showed no badge. Config was visually inspected on its default Updates tab and left open in EXPTRACK - Android. Synthetic updater hooks are confined to the debug test process, which was stopped.

Repeatable commands: `node scripts/check-settings-tabs.mjs` against local production port 3005; `node scripts/check-native-update-badge.mjs` with the debug WebView forwarded to 9325; `npm test`.

Signed local APK: `dist/EXPTRACK-1.11.3.apk`. SHA-256 `840c5b32ddb9a7bd2632c1348fd94a912d2b41235ef9bbab48b44f9f0e8fc979`, matching `android-update.json`. A real badge appears only when the published release is newer than the installed app.
