import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import assert from 'node:assert/strict';
const adb = `${process.env.ANDROID_HOME}/platform-tools/adb.exe`;
const device = process.env.ANDROID_TEST_DEVICE ?? 'emulator-5556';
const run = (...args) => execFileSync(adb, ['-s', device, ...args], { encoding: 'utf8' });
const emails = [0,1].map(() => `exptrack-android-${randomBytes(6).toString('hex')}@example.com`);
const password = randomBytes(12).toString('base64url');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { noDefaults: true });
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(30000);
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  run('shell', 'svc', 'wifi', 'enable'); run('shell', 'svc', 'data', 'enable');
  await page.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
  for (let i=0; i<2; i++) {
    await page.getByRole('link', { name: 'Create an account', exact: true }).click();
    await page.getByLabel('Name', { exact: true }).fill('Android test ' + i);
    await page.getByLabel('Email', { exact: true }).fill(emails[i]);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'CREATE ACCOUNT', exact: true }).click();
    await page.getByText('NO EXPENSES RECORDED YET').waitFor();
    if (i===0) {
      await page.getByRole('button', { name: 'Add Expense', exact: true }).last().click();
      await page.getByLabel('Amount', { exact: true }).fill('87.65');
      await page.getByLabel('Note', { exact: true }).fill('Android private record');
      await page.getByRole('button', { name: 'SAVE', exact: true }).click();
      await page.getByText('Android private record', { exact: true }).waitFor();
      run('shell', 'svc', 'wifi', 'disable'); run('shell', 'svc', 'data', 'disable');
      await page.reload();
      await page.getByText('Android private record', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Add Expense', exact: true }).last().click();
      await page.getByLabel('Amount', { exact: true }).fill('12.35');
      await page.getByLabel('Note', { exact: true }).fill('Created offline');
      await page.getByRole('button', { name: 'SAVE', exact: true }).click();
      await page.getByText('Created offline', { exact: true }).waitFor();
      const raw = run('shell', 'run-as', 'com.fakhrul.exptrack.debug', 'cat', 'shared_prefs/exptrack_session.xml');
      assert(!raw.includes(emails[i])); assert(!raw.includes(password));
      await page.getByRole('link', { name: 'CONFIG', exact: true }).click();
      await page.getByRole('button', { name: 'SIGN OUT', exact: true }).click();
      await page.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
      await page.getByLabel('Email', { exact: true }).fill(emails[i]);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'SIGN IN', exact: true }).click();
      await page.getByText('Connect to the internet to sign in or create an account.', { exact: true }).waitFor();
      run('shell', 'svc', 'wifi', 'enable'); run('shell', 'svc', 'data', 'enable');
      // Allow native network reconnection before next registration.
      await page.goto('https://localhost/login/');
    } else {
      assert.equal(await page.getByText('Android private record', { exact: true }).count(), 0);
      await page.getByRole('link', { name: 'CONFIG', exact: true }).click();
      await page.getByRole('button', { name: 'SIGN OUT', exact: true }).click();
    }
  }
  await page.getByLabel('Email', { exact: true }).fill(emails[0]);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'SIGN IN', exact: true }).click();
  await page.getByText('Created offline', { exact: true }).waitFor();
  await page.screenshot({ path: 'test-results/android-account.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: native Atlas registration/login, encrypted session, offline reload and expense creation, offline logout, offline login failure, account isolation and returning account');
} finally {
  run('shell', 'svc', 'wifi', 'enable'); run('shell', 'svc', 'data', 'enable');
  await browser.close();
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'expense_tracker' });
  const db=mongoose.connection.db;
  const users=await db.collection('users').find({email:{$in:emails}}).toArray();
  await db.collection('auth_sessions').deleteMany({userId:{$in:users.map(u=>u._id)}});
  await db.collection('users').deleteMany({_id:{$in:users.map(u=>u._id)}});
  await mongoose.disconnect();
}
