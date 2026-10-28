import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
const base = process.env.ACCOUNT_TEST_URL ?? 'http://127.0.0.1:3000';
const emails = [0, 1].map(() => `exptrack-sync-${randomBytes(6).toString('hex')}@example.com`);
const password = randomBytes(18).toString('base64url');
const now = new Date().toISOString();
const category = (_id, name) => ({ _id, name, icon: '☕', isDefault: false, createdAt: now, updatedAt: now });
const expense = (_id, categoryId, amount = 55.25) => ({ _id, categoryId, amount, note: 'Sync API test', date: now.slice(0, 10), createdAt: now, updatedAt: now });
const change = (store, record) => ({ store, id: record._id, mutationId: randomUUID(), record });
const deletion = (store, id) => ({ store, id, mutationId: randomUUID(), deleted: true });
async function request(path, body, token, origin = 'https://localhost') {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-EXPTRACK-Client': 'android', Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
const sync = (mutations, token, origin) => request('/api/sync/', { mutations }, token, origin);
try {
  const accounts = [];
  for (const email of emails) {
    const result = await request('/api/auth/register/', { name: 'Sync test', email, password });
    assert.equal(result.status, 200, JSON.stringify(result.body)); accounts.push(result.body);
  }
  const [a, b] = accounts;
  const categoryId = randomUUID(), otherCategoryId = randomUUID(), expenseId = randomUUID();
  const initialExpense = change('expenses', expense(expenseId, categoryId));
  let result = await sync([change('categories', category(categoryId, 'Sync coffee')), initialExpense], a.token);
  assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(result.body.expenses.length, 1);
  result = await sync([], b.token); assert.equal(result.status, 200); assert.equal(result.body.expenses.length, 0);
  result = await sync([change('categories', category(otherCategoryId, 'SYNC COFFEE'))], a.token);
  assert.equal(result.status, 200); assert.equal(result.body.categories.length, 1);
  assert(result.body.aliases.some(item => item.id === otherCategoryId && item.canonicalId === categoryId));
  result = await sync([change('expenses', expense(expenseId, otherCategoryId, 80))], a.token);
  assert.equal(result.body.expenses[0].categoryId, categoryId);
  result = await sync([initialExpense], a.token); assert.equal(result.body.expenses[0].amount, 80, 'replayed upload reverted an edit');
  result = await sync([deletion('categories', categoryId)], a.token); assert.equal(result.body.categories.length, 1); assert(result.body.warnings.length);
  result = await sync([deletion('expenses', expenseId)], a.token); assert.equal(result.body.expenses.length, 0);
  result = await sync([initialExpense], a.token); assert.equal(result.body.expenses.length, 0, 'replayed upload resurrected deleted expense');
  const offlineExpense = change('expenses', expense(randomUUID(), categoryId));
  const concurrent = await Promise.all([sync([deletion('categories', categoryId)], a.token), sync([offlineExpense], a.token)]);
  for (const response of concurrent) assert.equal(response.status, 200, JSON.stringify(response.body));
  result = await sync([], a.token); assert.equal(result.body.expenses.length, 1); assert.equal(result.body.categories.length, 1);
  const invalid = change('expenses', { ...expense(randomUUID(), categoryId), amount: { $gt: 0 } });
  assert.equal((await sync([invalid], a.token)).status, 400);
  assert.equal((await sync([], undefined)).status, 401);
  assert.equal((await sync([], a.token, 'https://evil.example')).status, 403);
  result = await sync([], b.token); assert.equal(result.body.expenses.length, 0); assert.equal(result.body.categories.length, 0);
  console.log('PASS: account-scoped cloud sync, create/edit/delete, category aliases, idempotent retries, concurrent integrity, malformed data and origin/auth rejection');
} finally {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'expense_tracker' });
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
  const userIds = users.map(user => user._id);
  for (const name of ['auth_sessions', 'cloud_records', 'cloud_mutations', 'cloud_category_aliases', 'cloud_sync_state']) await db.collection(name).deleteMany({ userId: { $in: userIds } });
  await db.collection('users').deleteMany({ _id: { $in: userIds } });
  await mongoose.disconnect();
}
