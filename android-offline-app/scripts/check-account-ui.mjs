import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
const base = process.env.ACCOUNT_TEST_URL ?? 'http://127.0.0.1:3000';
const emails = [0, 1].map(() => `exptrack-ui-${randomBytes(6).toString('hex')}@example.com`);
const password = randomBytes(12).toString('base64url');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(base);
  await page.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
  for (const [i, email] of emails.entries()) {
    await page.getByRole('link', { name: 'Create an account', exact: true }).click();
    await page.getByLabel('Name', { exact: true }).fill('Account ' + i);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'CREATE ACCOUNT', exact: true }).click();
    await page.getByText('NO EXPENSES RECORDED YET').waitFor();
    if (i === 0) {
      await page.getByRole('button', { name: 'Add Expense', exact: true }).last().click();
      await page.getByLabel('Amount', { exact: true }).fill('42.25');
      await page.getByLabel('Note', { exact: true }).fill('Private expense');
      await page.getByRole('button', { name: 'SAVE', exact: true }).click();
      await page.getByText('Private expense', { exact: true }).waitFor();
      await page.reload();
      await page.getByText('Private expense', { exact: true }).waitFor();
    } else assert.equal(await page.getByText('Private expense', { exact: true }).count(), 0);
    await page.getByRole('link', { name: 'CONFIG', exact: true }).click();
    await page.getByRole('button', { name: 'SIGN OUT', exact: true }).click();
    await page.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
  }
  await page.getByLabel('Email', { exact: true }).fill(emails[0]);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'SIGN IN', exact: true }).click();
  await page.getByText('Private expense', { exact: true }).waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: registration/login UI, logout, returning account, account data isolation, mobile width');
} finally {
  await browser.close();
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'expense_tracker' });
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ email: { $in: emails } }).toArray();
  await db.collection('auth_sessions').deleteMany({ userId: { $in: users.map(u => u._id) } });
  await db.collection('users').deleteMany({ _id: { $in: users.map(u => u._id) } });
  await mongoose.disconnect();
}
