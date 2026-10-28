import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const native = process.argv.includes('--native');
const adb = `${process.env.ANDROID_HOME}/platform-tools/adb.exe`;
const device = process.env.ANDROID_TEST_DEVICE ?? 'emulator-5556';
const run = (...args) => execFileSync(adb, ['-s', device, ...args], { encoding: 'utf8' });
const browser = native ? await chromium.connectOverCDP(process.env.ANDROID_CDP_URL ?? 'http://127.0.0.1:9222', { noDefaults: true }) : await chromium.launch({ channel: 'msedge', headless: true });
const context = native ? browser.contexts()[0] : await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' });
const page = native ? context.pages()[0] : await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
// Exercise local UI/storage without creating accounts or writing to production.
const session = { user: { id: 'eeeeeeeeeeeeeeeeeeeeeeee', name: 'Feature test', email: 'features@example.com' }, expiresAt: new Date(Date.now() + 86400000).toISOString(), token: 'local-test-token' };
await context.route('**/api/sync/**', route => route.fulfill({ json: { acknowledged: route.request().postDataJSON().mutations.map(m => m.mutationId), categories: [], expenses: [], deleted: [], aliases: [], warnings: [] } }));
await context.route('**/api/auth/**', route => route.fulfill({ json: session }));
const base = native ? 'https://localhost' : 'http://127.0.0.1:4173';
try {
  if (native) await page.evaluate(async () => {
    const storage = window.Capacitor.Plugins.ExpenseStore;
    const saved = await storage.readSession();
    if (saved.value) {
      if (JSON.parse(saved.value).user.id !== 'eeeeeeeeeeeeeeeeeeeeeeee') throw new Error('Use a fresh debug installation, or the synthetic feature test account.');
      await storage.writeSession({});
      await window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: 830 }] });
    }
  });
  await page.goto(`${base}/login/`);
  await page.getByLabel('Password', { exact: true }).fill('test-password-123');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'text');
  assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), 'test-password-123');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'password');
  await page.getByRole('link', { name: 'Create an account', exact: true }).click();
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'text');
  await page.getByLabel('Name', { exact: true }).fill('Feature test');
  await page.getByLabel('Email', { exact: true }).fill(session.user.email);
  await page.getByLabel('Password', { exact: true }).fill('test-password-123');
  await page.getByRole('button', { name: 'CREATE ACCOUNT', exact: true }).click();
  await page.getByRole('button', { name: 'Grid view', exact: true }).waitFor();
  if (native) {
    // Remove only records made by earlier runs in this synthetic test account.
    await page.evaluate(async () => {
      const store = window.Capacitor.Plugins.ExpenseStore;
      const { records } = await store.list({ store: 'expenses' });
      for (const record of records.filter(item => ['Daily feature one', 'Daily feature two'].includes(item.note))) await store.remove({ store: 'expenses', id: record._id });
    });
    await page.reload();
    await page.getByRole('button', { name: 'Grid view', exact: true }).waitFor();
  }
  for (const [amount, note] of [['42.25', 'Daily feature one'], ['12.75', 'Daily feature two']]) {
    await page.getByRole('button', { name: 'Add Expense', exact: true }).last().click();
    await page.getByLabel('Amount', { exact: true }).fill(amount);
    await page.getByLabel('Note', { exact: true }).fill(note);
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    await page.getByText(note, { exact: true }).waitFor();
  }
  await page.getByText(/Day Total:/).first().waitFor();
  const totals = ['Day Total: \u09f355.00'];
  await expect.poll(() => page.getByText(/Day Total:/).allTextContents()).toEqual(totals);
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  assert.equal(await page.locator('[data-entry-view="grid"] .expense-row').count(), 2);
  await expect.poll(() => page.getByText(/Day Total:/).allTextContents()).toEqual(totals);
  for (const width of native ? [360] : [320, 360, 768]) {
    if (!native) await page.setViewportSize({ width, height: 780 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
    assert.equal(await page.locator('[data-entry-view="grid"]').first().evaluate(e => getComputedStyle(e).display), 'grid');
  }
  await page.reload();
  await page.locator('[data-entry-view="grid"]').waitFor();
  const row = page.locator('.expense-row').filter({ hasText: 'Daily feature one' });
  await row.getByRole('button', { name: 'Edit Expense', exact: true }).click();
  await page.getByLabel('Amount', { exact: true }).fill('50');
  await page.getByRole('button', { name: 'UPDATE', exact: true }).click();
  await row.getByText(/50\.00/, { exact: false }).waitFor();
  await row.getByRole('button', { name: 'Delete Expense', exact: true }).click();
  await page.getByRole('button', { name: 'YES, DELETE', exact: true }).click();
  await page.getByText('Daily feature one', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  assert.equal(await page.locator('[data-entry-view="list"] .expense-row').count(), 1);
  await page.goto(`${base}/settings/`);
  if (native) {
    const pending = () => page.evaluate(() => window.Capacitor.Plugins.LocalNotifications.getPending());
    await page.getByRole('switch', { name: 'REMINDER ON', exact: true }).waitFor();
    let alarms = (await pending()).notifications;
    assert.equal(alarms.filter(n => n.id === 830).length, 1);
    assert.equal(alarms.find(n => n.id === 830).schedule.on.hour, 20);
    assert.equal(alarms.find(n => n.id === 830).schedule.on.minute, 30);
    await page.getByRole('switch').click();
    await page.getByRole('switch', { name: 'ENABLE REMINDER', exact: true }).waitFor();
    assert(!(await pending()).notifications.some(n => n.id === 830));
    await page.reload();
    await page.getByRole('switch', { name: 'ENABLE REMINDER', exact: true }).waitFor();
    await page.getByRole('switch').click();
    await page.getByRole('switch', { name: 'REMINDER ON', exact: true }).waitFor();
    // getPending() omits icon fields; inspect only the debug notification store.
    const xml = run('shell', 'run-as', 'com.fakhrul.exptrack.debug', 'cat', 'shared_prefs/NOTIFICATION_STORE.xml');
    const stored = xml.match(/<string name="830">([\s\S]*?)<\/string>/)?.[1];
    assert(stored, 'daily reminder payload was not persisted');
    const entities = { quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' };
    const daily = JSON.parse(stored.replace(/&(quot|apos|lt|gt|amp);/g, (_, key) => entities[key]));
    assert.equal(daily.smallIcon, 'ic_stat_spending');
    assert.equal(daily.largeIcon, 'exptrack_notification');
    assert.equal(daily.iconColor, '#EA580C');
    await mkdir('test-results', { recursive: true });
    await writeFile('test-results/reminder-payload.json', JSON.stringify(daily, null, 2));
    await page.evaluate(notification => window.Capacitor.Plugins.LocalNotifications.schedule({ notifications: [{ ...notification, id: 831, schedule: { at: new Date(Date.now() + 5000).toISOString(), allowWhileIdle: true } }] }), daily);
    run('shell', 'input', 'keyevent', 'KEYCODE_HOME');
    await page.waitForTimeout(12000);
    assert(run('shell', 'dumpsys', 'notification', '--noredact').includes("Time to enter today's spending"), 'background notification not delivered');
    run('shell', 'am', 'start', '-n', 'com.fakhrul.exptrack.debug/com.fakhrul.exptrack.MainActivity');
    await page.evaluate(async () => {
      await window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: 831 }] });
      await window.Capacitor.Plugins.LocalNotifications.removeDeliveredNotifications({ notifications: [{ id: 831 }] });
    });
    await page.getByRole('button', { name: 'SIGN OUT', exact: true }).click();
    await page.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
    assert(!(await pending()).notifications.some(n => n.id === 830));
  } else await page.getByText('Daily background notifications are available in the Android app.', { exact: true }).waitFor();
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: `test-results/daily-features-${native ? 'android' : 'web'}.png` });
  assert.deepEqual(errors, []);
  console.log(`PASS (${native ? 'Android' : 'web'}): password visibility, list/grid persistence, totals, edit/delete, layout${native ? ', daily schedule, disable/re-enable, background delivery, logout cancellation' : ', reminder platform message'}`);
} finally { await browser.close(); }
