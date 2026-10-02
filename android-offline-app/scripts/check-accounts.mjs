import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
const base = process.env.ACCOUNT_TEST_URL ?? 'http://127.0.0.1:3000';
const email = `exptrack-test-${randomBytes(6).toString('hex')}@example.com`;
const password = randomBytes(18).toString('base64url');
async function request(action, body, token, origin = 'https://localhost') {
  const res = await fetch(`${base}/api/auth/${action}/`, { method: action === 'me' ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'X-EXPTRACK-Client': 'android', Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json(), headers: res.headers };
}
try {
  const created = await request('register', { name: 'Account test', email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.equal(created.headers.get('access-control-allow-origin'), 'https://localhost');
  assert(created.body.token);
  assert(!JSON.stringify(created.body).includes(password));
  assert.equal((await request('register', { name: 'Duplicate', email, password })).status, 409);
  assert.equal((await request('login', { email, password: 'wrong-password' })).status, 401);
  assert.equal((await request('login', { email: { $gt: '' }, password })).status, 400);
  assert.equal((await request('login', { email, password }, undefined, 'https://evil.example')).status, 403);
  const login = await request('login', { email: email.toUpperCase(), password });
  assert.equal(login.status, 200);
  assert.equal((await request('me', undefined, login.body.token)).body.user.email, email);
  assert.equal((await request('logout', undefined, login.body.token)).status, 200);
  assert.equal((await request('me', undefined, login.body.token)).status, 401);
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'expense_tracker', serverSelectionTimeoutMS: 10000 });
  const doc = await mongoose.connection.db.collection('users').findOne({ email });
  assert(doc);
  assert.notEqual(doc.passwordHash, password);
  assert(await bcrypt.compare(password, doc.passwordHash));
  assert.equal(doc.password, undefined);
  console.log('PASS: Atlas registration/persistence, bcrypt, login, normalization, duplicates, wrong password, injection rejection, CORS, session validation and logout revocation');
} finally {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI, { dbName: 'expense_tracker', serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email });
  if (user) { await db.collection('auth_sessions').deleteMany({ userId: user._id }); await db.collection('users').deleteOne({ _id: user._id }); }
  await mongoose.disconnect();
}
