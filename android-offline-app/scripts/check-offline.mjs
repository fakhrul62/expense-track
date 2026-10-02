import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const native = process.argv.includes('--native');
const adb = process.env.ANDROID_HOME && `${process.env.ANDROID_HOME}/platform-tools/adb.exe`;
await mkdir('test-results', { recursive: true });
const browser = native ? await chromium.connectOverCDP('http://127.0.0.1:9222', { noDefaults: true }) : await chromium.launch({ channel: 'msedge', headless: true });
const context = native ? browser.contexts()[0] : await browser.newContext({ viewport: { width: 360, height: 780 }, timezoneId: 'Asia/Dhaka', reducedMotion: 'reduce' });
const page = native ? context.pages().find(p => p.url().includes('localhost')) : await context.newPage();
if (!page) throw new Error('Android WebView not found');
page.setDefaultTimeout(15000);
const errors = [], external = [], api = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname.startsWith('/api/')) api.push(request.url());
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol.startsWith('http')) external.push(request.url());
});
if (!native) {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.clock.install({ time: new Date('2026-10-01T19:05:00Z') });
  await page.goto('http://127.0.0.1:4173');
}
await page.getByText('NO EXPENSES RECORDED YET').waitFor();
const addExpense = async (amount, note, date) => {
  await page.getByRole('button', { name: 'Add Expense', exact: true }).last().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('0.00').fill(amount);
  if (date) await dialog.locator('input[type="date"]').fill(date);
  await dialog.getByPlaceholder('e.g. Morning commute, Lunch combo...').fill(note);
  await dialog.getByRole('button', { name: 'SAVE', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
};
await addExpense('125.50', 'Offline commute');
await page.getByText('Offline commute', { exact: true }).waitFor();
assert.match(await page.locator('main').innerText(), /125\.50/);
if (!native) {
  // 01:05 in Dhaka is still the previous UTC day.
  const dates = await page.evaluate(async () => {
    const db = await new Promise(resolve => { const r = indexedDB.open('exptrack-local'); r.onsuccess = () => resolve(r.result); });
    return new Promise(resolve => { const r = db.transaction('expenses').objectStore('expenses').getAll(); r.onsuccess = () => resolve(r.result.map(x => x.date)); });
  });
  assert.deepEqual(dates, ['2026-10-02']);
}
await page.getByRole('button', { name: 'Edit Expense', exact: true }).click();
await page.getByPlaceholder('0.00').fill('250.75');
await page.getByRole('button', { name: 'UPDATE', exact: true }).click();
await page.getByRole('dialog').waitFor({ state: 'hidden' });
await page.reload();
await page.getByText('Offline commute', { exact: true }).waitFor();
assert.match(await page.locator('main').innerText(), /250\.75/);
await page.getByRole('button', { name: 'Previous Month' }).click();
await page.getByText('NO EXPENSES RECORDED YET').waitFor();
assert.match(await page.locator('main').innerText(), /250\.75/); // Today's total is independent of selected month.
await page.getByRole('button', { name: 'Next Month' }).click();
await page.getByText('Offline commute', { exact: true }).waitFor();
await page.getByRole('link', { name: 'CONFIG', exact: true }).click();
await page.getByText('ON THIS DEVICE', { exact: true }).waitFor();
await page.getByRole('button', { name: 'ADD', exact: true }).click();
await page.getByPlaceholder('e.g. Snacks, Coffee, Taxi...').fill('Coffee test');
await page.getByRole('button', { name: 'ADD CATEGORY', exact: true }).click();
await page.getByText('Coffee test', { exact: true }).waitFor();
await page.getByRole('button', { name: 'DARK MODE', exact: true }).click();
await page.reload();
await page.getByText('Coffee test', { exact: true }).waitFor();
assert(await page.locator('html').evaluate(el => el.classList.contains('dark')));
await page.getByRole('link', { name: 'HOME', exact: true }).click();
await page.getByText('Offline commute', { exact: true }).waitFor();
await page.getByRole('button', { name: 'Add Expense', exact: true }).last().click();
await page.getByPlaceholder('0.00').fill('1.10');
await page.getByRole('button', { name: /Coffee test/ }).click();
await page.getByPlaceholder('e.g. Morning commute, Lunch combo...').fill('Category integrity');
await page.getByRole('button', { name: 'SAVE', exact: true }).click();
await page.getByRole('dialog').waitFor({ state: 'hidden' });
await page.getByRole('link', { name: 'CONFIG', exact: true }).click();
await page.getByRole('button', { name: 'Delete Coffee test', exact: true }).click();
await page.getByRole('button', { name: 'YES, DELETE', exact: true }).click();
await page.getByText('This category has expenses. Reassign or remove them first.', { exact: false }).waitFor();
await page.getByRole('link', { name: 'HOME', exact: true }).click();
await page.getByText('Category integrity', { exact: true }).waitFor();
await page.getByRole('button', { name: 'Add Expense', exact: true }).last().click();
if (native) {
  // Hide the keyboard, then Android back should dismiss the sheet, not exit.
  await page.locator('input:focus').evaluateAll(inputs => inputs.forEach(input => input.blur()));
  execFileSync(adb, ['shell', 'input', 'keyevent', '4']);
  if (await page.getByRole('dialog').isVisible()) execFileSync(adb, ['shell', 'input', 'keyevent', '4']);
} else await page.keyboard.press('Escape');
await page.getByRole('dialog').waitFor({ state: 'hidden' });
const integrityRow = page.locator('.expense-row').filter({ hasText: 'Category integrity' });
await integrityRow.getByRole('button', { name: 'Delete Expense', exact: true }).click();
await page.getByRole('button', { name: 'YES, DELETE', exact: true }).click();
await integrityRow.waitFor({ state: 'hidden' });
await page.getByRole('link', { name: 'CONFIG', exact: true }).click();
await page.getByRole('button', { name: 'Delete Coffee test', exact: true }).click();
await page.getByRole('button', { name: 'YES, DELETE', exact: true }).click();
await page.getByText('Coffee test', { exact: true }).waitFor({ state: 'hidden' });
await page.getByRole('link', { name: 'HOME', exact: true }).click();
await page.getByText('Offline commute', { exact: true }).waitFor();
await page.screenshot({ path: `test-results/${native ? 'android' : 'browser'}-offline.png`, fullPage: true });
if (!native) {
  for (const width of [320, 360, 412, 768]) {
    await page.setViewportSize({ width, height: 780 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
  }
  await page.setViewportSize({ width: 360, height: 780 });
  await page.evaluate(async () => {
    const db = await new Promise(resolve => { const r = indexedDB.open('exptrack-local'); r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction('expenses', 'readwrite');
    for (let i = 0; i < 240; i++) tx.objectStore('expenses').put({ _id: `bulk-${i}`, amount: 1, categoryId: 'default-bus', note: `Bulk ${i}`, date: '2026-10-02', createdAt: '2026-10-02T01:00:00Z', updatedAt: '2026-10-02T01:00:00Z' });
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
  });
  await page.reload();
  await page.getByRole('button', { name: /SHOW MORE/ }).waitFor();
  assert.equal(await page.locator('.expense-row').count(), 60);
  assert.match(await page.locator('main').innerText(), /490\.75/);
  await page.getByRole('button', { name: /SHOW MORE/ }).click();
  assert.equal(await page.locator('.expense-row').count(), 120);
}
assert.deepEqual(api, [], 'No server API calls');
assert.deepEqual(external, [], 'No external resources');
assert.deepEqual(errors, [], 'No JavaScript crashes');
const result = { platform: native ? 'Android emulator / SQLite' : 'Browser / IndexedDB', passed: true, checks: ['first launch', 'create/edit/delete', 'reload persistence', 'month navigation', 'daily total', 'custom categories', 'category integrity', 'theme persistence', 'modal back/escape', ...(native ? [] : ['Dhaka date boundary', '320–768px layout', '241 records / paged list'])], externalRequests: external, apiRequests: api, errors };
await writeFile(`test-results/${native ? 'android' : 'browser'}-results.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
