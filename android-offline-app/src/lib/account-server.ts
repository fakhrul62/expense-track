import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { GoogleIdentityError, verifyGoogleIdentity } from "@/lib/google-server";

let connection: Promise<typeof mongoose> | undefined;
async function database() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Database is not configured");
  connection ??= mongoose.connect(uri, { dbName: "expense_tracker", serverSelectionTimeoutMS: 10000 }).catch(error => { connection = undefined; throw error; });
  await connection;
  return mongoose.connection.db!;
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
let indexes: Promise<unknown> | undefined;
export async function accountDatabase() {
  const db = await database();
  indexes ??= Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("auth_sessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("auth_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("auth_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("google_challenges").createIndex({ nonceHash: 1 }, { unique: true }),
    db.collection("google_challenges").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("users").createIndex({ googleSubject: 1 }, { unique: true, partialFilterExpression: { googleSubject: { $type: "string" } } }),
  ]).catch(error => { indexes = undefined; throw error; });
  await indexes;
  return db;
}
export function accountCors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = new Set(["https://localhost", new URL(req.url).origin, "https://expense-track-lovat.vercel.app"]);
  if (process.env.NODE_ENV !== "production") allowed.add("http://localhost:3000");
  return origin && allowed.has(origin) ? {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-EXPTRACK-Client",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  } : {};
}
export function accountReply(req: NextRequest, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { ...accountCors(req), "Cache-Control": "no-store" } });
}
const cors = accountCors;
const reply = accountReply;
export async function authenticatedAccount(req: NextRequest) {
  const db = await accountDatabase();
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? req.cookies.get("exptrack_session")?.value;
  const session = token && await db.collection("auth_sessions").findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
  const user = session && await db.collection("users").findOne({ _id: session.userId });
  return user ? { db, userId: user._id } : null;
}
const profile = (user: { _id: mongoose.Types.ObjectId; name?: unknown; email?: unknown }) => ({ id: user._id.toString(), name: user.name, email: user.email });
export async function accountHandler(req: NextRequest, action: string) {
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: cors(req) });
  const origin = req.headers.get("origin");
  if (origin && !Object.keys(cors(req)).length) return reply(req, { error: "Origin not allowed" }, 403);
  try {
    if (!['login', 'register', 'me', 'logout', 'google-config', 'google-start', 'google'].includes(action)) return reply(req, { error: "Not found" }, 404);
    if (req.method !== (["me", "google-config"].includes(action) ? "GET" : "POST")) return reply(req, { error: "Method not allowed" }, 405);
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (action === "google-config") return reply(req, { clientId: googleClientId ?? null });
    if (action.startsWith("google") && !googleClientId) return reply(req, { error: "Google sign-in is not available yet. Please use email and password." }, 503);
    const db = await accountDatabase();
    const users = db.collection("users");
    const sessions = db.collection("auth_sessions");
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? req.cookies.get("exptrack_session")?.value;
    if (action === "logout") {
      if (token) await sessions.deleteOne({ tokenHash: digest(token) });
      const res = reply(req, { success: true }); res.cookies.delete("exptrack_session"); return res;
    }
    if (action === "me") {
      const session = token && await sessions.findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
      const user = session && await users.findOne({ _id: session.userId });
      return user ? reply(req, { user: profile(user), expiresAt: session.expiresAt }) : reply(req, { error: "Please sign in again" }, 401);
    }
    if (Number(req.headers.get("content-length") ?? 0) > 4096) return reply(req, { error: "Request too large" }, 413);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
    const bucket = Math.floor(Date.now() / 600000);
    const limit = await db.collection("auth_limits").findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(digest(`${ip}:${bucket}`).slice(0, 24)) },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * 600000) } },
      { upsert: true, returnDocument: "after" },
    );
    if ((limit?.count ?? 0) > 30) return reply(req, { error: "Too many attempts. Try again in 10 minutes." }, 429);
    if (action === "google-start") {
      const nonce = randomBytes(32).toString("base64url");
      await db.collection("google_challenges").insertOne({ nonceHash: digest(nonce), expiresAt: new Date(Date.now() + 10 * 60000) });
      return reply(req, { clientId: googleClientId, nonce });
    }
    const raw = await req.text();
    if (raw.length > 4096) return reply(req, { error: "Request too large" }, 413);
    let input;
    try { input = JSON.parse(raw); } catch { return reply(req, { error: "Invalid request" }, 400); }
    let user;
    if (action === "google") {
      if (!input || typeof input.idToken !== "string" || input.idToken.length > 3800 || typeof input.nonce !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(input.nonce)) return reply(req, { error: "Invalid Google sign-in request" }, 400);
      let identity;
      try { identity = await verifyGoogleIdentity(input.idToken, input.nonce, googleClientId!); }
      catch (error) { if (error instanceof GoogleIdentityError) return reply(req, { error: error.message }, 401); throw error; }
      // Single-use challenge prevents replay, including concurrent requests.
      const challenge = await db.collection("google_challenges").findOneAndDelete({ nonceHash: digest(input.nonce), expiresAt: { $gt: new Date() } });
      if (!challenge) return reply(req, { error: "Google sign-in expired. Please try again." }, 401);
      user = await users.findOne({ googleSubject: identity.subject });
      if (!user) {
        const existing = await users.findOne({ email: identity.email });
        if (existing) {
          // Google is not authoritative for arbitrary third-party email domains.
          if (!identity.authoritativeEmail || (existing.googleSubject && existing.googleSubject !== identity.subject)) return reply(req, { error: "This email already has an account. Please sign in with its email and password." }, 409);
          user = await users.findOneAndUpdate({ _id: existing._id, $or: [{ googleSubject: { $exists: false } }, { googleSubject: identity.subject }] }, { $set: { googleSubject: identity.subject } }, { returnDocument: "after" });
        } else {
          try {
            user = await users.findOneAndUpdate({ googleSubject: identity.subject }, { $setOnInsert: { email: identity.email, name: identity.name, createdAt: new Date() } }, { upsert: true, returnDocument: "after" });
          } catch (error) {
            if (error instanceof Error && "code" in error && error.code === 11000) return reply(req, { error: "An account was created during sign-in. Please try again." }, 409);
            throw error;
          }
        }
      }
      if (!user) return reply(req, { error: "Could not complete Google sign-in. Please try again." }, 409);
    } else {
    if (!input || typeof input.email !== "string" || typeof input.password !== "string") return reply(req, { error: "Email and password are required" }, 400);
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || Buffer.byteLength(password) > 72 || password.length < (action === "register" ? 8 : 1)) return reply(req, { error: "Enter a valid email and password. New passwords need at least 8 characters (maximum 72 bytes)." }, 400);
    if (action === "register") {
      if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 80) return reply(req, { error: "Enter your name (up to 80 characters)." }, 400);
      const passwordHash = await bcrypt.hash(password, 12);
      try {
        const doc = { name: input.name.trim(), email, passwordHash, createdAt: new Date() };
        const result = await users.insertOne(doc);
        user = { ...doc, _id: result.insertedId };
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === 11000) return reply(req, { error: "An account with this email already exists." }, 409);
        throw error;
      }
    } else {
      user = await users.findOne({ email });
      // Run password hashing even for unknown accounts to avoid a fast existence check.
      const hash = typeof user?.passwordHash === "string" ? user.passwordHash : await bcrypt.hash("unavailable-account", 12);
      if (!await bcrypt.compare(password, hash) || !user) return reply(req, { error: "Invalid email or password." }, 401);
    }
    }
    const sessionToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 30 * 86400000);
    await sessions.insertOne({ userId: user._id, tokenHash: digest(sessionToken), createdAt: new Date(), expiresAt });
    const android = req.headers.get("x-exptrack-client") === "android";
    const res = reply(req, { user: profile(user), expiresAt, ...(android ? { token: sessionToken } : {}) });
    if (!android) res.cookies.set("exptrack_session", sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 86400 });
    return res;
  } catch {
    return reply(req, { error: "Account service is temporarily unavailable. Please try again." }, 503);
  }
}
