import { OAuth2Client } from "google-auth-library";

const verifier = new OAuth2Client();
export class GoogleIdentityError extends Error {}
export async function verifyGoogleIdentity(idToken: string, nonce: string, clientId: string, client = verifier) {
  let payload;
  try {
    payload = (await client.verifyIdToken({ idToken, audience: clientId })).getPayload();
  } catch { throw new GoogleIdentityError("Google could not verify this sign-in. Please try again."); }
  if (!payload || !payload.sub || payload.email_verified !== true || typeof payload.email !== "string" ||
      payload.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) ||
      (payload as unknown as { nonce?: string }).nonce !== nonce) {
    throw new GoogleIdentityError("Google could not verify this sign-in. Please try again.");
  }
  return {
    subject: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: (payload.name || payload.email.split("@")[0]).slice(0, 80),
    authoritativeEmail: payload.email.toLowerCase().endsWith("@gmail.com") || Boolean(payload.hd),
  };
}
