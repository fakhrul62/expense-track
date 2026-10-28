import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import { mkdir } from 'node:fs/promises';

const base = 'https://expense-track-lovat.vercel.app';
const adb = `${process.env.ANDROID_HOME}/platform-tools/adb.exe`;
const device = process.env.ANDROID_TEST_DEVICE ?? 'emulator-5556';
const run = (...args) => execFileSync(adb, ['-s', device, ...args], { encoding: 'utf8' });
const tag = randomBytes(5).toString('hex');
const emails = [0, 1].map(i => `exptrack-devices-${tag}-${i}@example.com`);
const password = randomBytes(18).toString('base64url');
const note = `Offline app entry ${tag}`;
const pendingNote = `Pending account A ${tag}`;
const accounts = [];
const nativeBrowser = await chromium.connectOverCDP(process.env.ANDROID_CDP_URL ?? 'http://127.0.0.1:9222', { noDefaults: true });
const app = nativeBrowser.contexts()[0].pages()[0];
// Exercise native sync on supported WebViews that have no AbortSignal.any.
await app.context().addInitScript(() => { Object.defineProperty(AbortSignal, 'any', { configurable: true, value: undefined }); });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const web = await browser.newPage({ viewport: { width: 360, height: 780 } });
app.setDefaultTimeout(90000); web.setDefaultTimeout(45000);
const errors = [];
app.on('pageerror', e => errors.push(`Android: ${e.message}`)); web.on('pageerror', e => errors.push(`web: ${e.message}`));
async function login(page, email) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'SIGN IN', exact: true }).click();
  await page.getByRole('button', { name: 'Grid view', exact: true }).waitFor();
}
async function add(page, amount, note) {
  await page.getByRole('button', { name: 'Add Expense', exact: true }).last().click();
  await page.getByLabel('Amount', { exact: true }).fill(amount);
  await page.getByLabel('Note', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'SAVE', exact: true }).click();
  await page.getByText(note, { exact: true }).waitFor();
}
async function cloud(account) {
  const response = await fetch(`${base}/api/sync/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account.token}`, Origin: 'https://localhost' }, body: JSON.stringify({ mutations: [] }) });
  assert.equal(response.status, 200); return response.json();
}
let isOffline = false;
await app.context().route('https://expense-track-lovat.vercel.app/**', route => isOffline ? route.abort('internetdisconnected') : route.continue());
await app.context().addInitScript(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => sessionStorage.getItem('test-offline') !== 'yes' }); });
const offline = async () => {
  isOffline = true;

  await app.evaluate(() => { sessionStorage.setItem('test-offline', 'yes'); Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); window.dispatchEvent(new Event('offline')); });
};
const online = async () => {
  isOffline = false;
  await app.evaluate(() => { sessionStorage.removeItem('test-offline'); Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }); window.dispatchEvent(new Event('online')); });
  run('shell', 'svc', 'wifi', 'enable'); run('shell', 'svc', 'data', 'enable');
  await app.waitForFunction(() => navigator.onLine);
  await app.evaluate(() => window.dispatchEvent(new Event('exptrack:resume')));
};
const synced = page => page.getByRole('status').filter({ hasText: 'Synced to your account' }).waitFor();
try {
  await app.context().setOffline(false);
  run('shell', 'svc', 'wifi', 'enable'); run('shell', 'svc', 'data', 'enable');
  await app.goto('https://localhost/login/');
  await app.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
  // Existing feature-test database must retain its records through an app upgrade.
  const migration = await app.evaluate(async () => {
    const store = window.Capacitor.Plugins.ExpenseStore;
    const accountId = 'eeeeeeeeeeeeeeeeeeeeeeee';
    await store.setUser({ id: accountId });
    const { records } = await store.list({ store: 'expenses' });
    const { mutations } = await store.syncPending({ accountId });
    return { count: records.length, preserved: records.some(item => item.note === 'Daily feature two'), queued: mutations.some(item => item.store === 'expenses' && item.record?.note === 'Daily feature two') };
  });
  assert(migration.preserved, 'existing SQLite expense was not preserved after the app upgrade');
  const googleButton = app.getByRole('button', { name: 'Continue with Google', exact: true });
  await expect(googleButton).toBeEnabled();
  await googleButton.click();
  await app.getByRole('alert').filter({ hasText: 'Google Play services' }).waitFor();
  console.log('PASS: native Google credential bridge runs; emulator without Google Play services shows a recoverable error');
  for (const email of emails) {
    const response = await fetch(`${base}/api/auth/register/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-EXPTRACK-Client': 'android', Origin: 'https://localhost' }, body: JSON.stringify({ name: 'Device sync test', email, password }) });
    const account = await response.json(); assert.equal(response.status, 200, JSON.stringify(account)); accounts.push(account);
  }
  await login(app, emails[0]); await synced(app);
  await web.goto(`${base}/login/`); await login(web, emails[0]); await synced(web);
  await offline(); await app.waitForFunction(() => !navigator.onLine);
  await add(app, '42.25', note);
  await app.reload(); await app.getByText(note, { exact: true }).waitFor();
  assert.equal((await cloud(accounts[0])).expenses.length, 0, 'offline write uploaded before reconnect');
  await online(); await synced(app); console.log('PASS: reconnect synced');
  await web.reload(); await web.getByText(note, { exact: true }).waitFor();
  assert.equal((await cloud(accounts[0])).expenses[0].amount, 42.25);
  const row = web.locator('.expense-row').filter({ hasText: note });
  await row.getByRole('button', { name: 'Edit Expense', exact: true }).click();
  await web.getByLabel('Amount', { exact: true }).fill('90.50');
  await web.getByRole('button', { name: 'UPDATE', exact: true }).click(); await synced(web);
  await expect.poll(async () => (await cloud(accounts[0])).expenses[0]?.amount, { timeout: 45000 }).toBe(90.50);
  await app.evaluate(() => window.dispatchEvent(new Event('exptrack:resume')));
  await app.locator('.expense-row').filter({ hasText: note }).getByText(/90\.50/, { exact: false }).waitFor();
  await offline(); await app.waitForFunction(() => !navigator.onLine);
  await app.locator('.expense-row').filter({ hasText: note }).getByRole('button', { name: 'Delete Expense', exact: true }).click();
  await app.getByRole('button', { name: 'YES, DELETE', exact: true }).click();
  await app.getByText(note, { exact: true }).waitFor({ state: 'hidden' });
  await online(); await synced(app); await web.reload(); await synced(web);
  assert.equal(await web.getByText(note, { exact: true }).count(), 0);
  await offline(); await app.waitForFunction(() => !navigator.onLine);
  await add(app, '11.75', pendingNote);
  await app.goto('https://localhost/settings/');
  await app.getByRole('button', { name: 'SIGN OUT', exact: true }).click();
  await app.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
  await online(); await login(app, emails[1]); await synced(app);
  assert.equal(await app.getByText(pendingNote, { exact: true }).count(), 0);
  assert.equal((await cloud(accounts[1])).expenses.length, 0);
  assert.equal((await cloud(accounts[0])).expenses.length, 0, 'pending account A change was uploaded using account B');
  await app.goto('https://localhost/settings/'); await app.getByRole('button', { name: 'SIGN OUT', exact: true }).click();
  await app.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
  await login(app, emails[0]); await synced(app);
  await web.reload(); await web.getByText(pendingNote, { exact: true }).waitFor();
  assert.equal((await cloud(accounts[1])).expenses.length, 0);
  assert.deepEqual(errors, []);
  await mkdir('test-results', { recursive: true });
  await app.screenshot({ path: 'test-results/android-cloud-sync.png' });
  await web.screenshot({ path: 'test-results/site-cloud-sync.png' });
  console.log('PASS: SQLite persistence, offline Android entry/reload/reconnect upload, real website download, site edit back to Android, offline deletion, pending-queue account isolation and return-to-account sync');
} finally {
  isOffline = false;
  run('shell', 'svc', 'wifi', 'enable'); run('shell', 'svc', 'data', 'enable');
  await app.evaluate(async () => { await window.Capacitor.Plugins.ExpenseStore.writeSession({}); await window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: 830 }] }); }).catch(() => undefined);
  await nativeBrowser.close(); await browser.close();
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'expense_tracker' });
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
  const userIds = users.map(user => user._id);
  for (const name of ['auth_sessions', 'cloud_records', 'cloud_mutations', 'cloud_category_aliases', 'cloud_sync_state']) await db.collection(name).deleteMany({ userId: { $in: userIds } });
  await db.collection('users').deleteMany({ _id: { $in: userIds } });
  await mongoose.disconnect();
}
