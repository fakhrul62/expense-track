# EXPTRACK Google sign-in configuration

Google Cloud project: EXPTRACK (`delta-athlete-510418-u5`). Consent audience is External and publishing status is In production. The sign-in flow requests identity information only; expense data is stored by EXPTRACK, not in Google Drive.

Web/server client ID: `563848355186-0atd4psblbjr60i94eb1hchmbc9v27qr.apps.googleusercontent.com`.

Authorized JavaScript origins:

- https://expense-track-lovat.vercel.app
- http://localhost:3000
- http://127.0.0.1:3000

Android release client: `563848355186-vcbvov95l0nleo6bnh5e4p4al0q215lk.apps.googleusercontent.com`.

- Package: `com.fakhrul.exptrack`
- Signing SHA-1: `2D:EC:AF:2A:86:D3:75:F9:FE:FE:93:2E:A1:6A:8A:16:B6:BE:1C:70`

Android debug client: `563848355186-n5cs5liikegpj59lrooohqgq61epa15b.apps.googleusercontent.com`.

- Package: `com.fakhrul.exptrack.debug`
- Signing SHA-1: `CB:D0:C1:EB:14:12:1A:98:E6:8D:75:C9:C6:E6:0C:D6:29:5D:E1:34`

Both platforms use the Web/server client ID as the ID token audience. Android uses Credential Manager with GetSignInWithGoogleOption and requires Google Play services. The backend verifies the token signature, issuer, expiry, audience, verified email and a single-use nonce before creating a session. No Google client secret is needed for this flow.

Server environment: GOOGLE_CLIENT_ID contains the public Web/server client ID; MONGODB_URI stays server-only. Public privacy policy: https://expense-track-lovat.vercel.app/privacy/.

Changing the application ID or signing key requires a matching Android OAuth client. Future APK updates must retain the existing release signing key. Google password entry remains in Google's UI.
