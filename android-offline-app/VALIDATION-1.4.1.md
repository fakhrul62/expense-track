# EXPTRACK 1.4.1 launch-screen fix

Android versionCode 8.
APK: dist/EXPTRACK-1.4.1.apk
SHA-256: e595a5d429cc22b9522a0f3be46d2735278a3874fdae5102aefb939df124ee29

The prior splash logo contained a full cream rectangle. The phone screenshot showed that opaque image against a dark system launch window. This release removes that rectangle from the splash vector and separates the launcher icon from the splash artwork. Android 12+ now receives explicit platform splash attributes. Both the application and launcher activity reference the launch theme. Background resources select cream in system light mode and charcoal in system dark mode, with matching system-bar contrast. Adaptive and legacy launcher assets use the existing EXPTRACK artwork.

Mobile export and release/debug builds passed. APK v2/v3 signatures, forced legacy v1 signature verification, zip alignment and delivered-file hash checks passed. Signed release update installed on the Android 15/API 35 emulator.

Two device instrumentation tests passed on Android 15. LaunchThemeTest checks the actual manifest/theme resources in both day and night configurations: platform splash background, transparent icon background, transparent vector corners, visible central artwork and adaptive launcher drawable. The generated package-name test was corrected to assert EXPTRACK instead of the Capacitor template package.

No expense storage, income calculations, sync protocol, credentials, or signing identity changed. Existing 1.4.0 functional coverage is documented in VALIDATION-1.4.0.md. The user's specific OEM handset is not connected; the supplied screenshot motivated the native resource fixes and emulator regression coverage.
