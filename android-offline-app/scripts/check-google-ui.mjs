import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const nonce = 'a'.repeat(43);
const session = { user: { id: 'dddddddddddddddddddddddd', name: 'Google UI test', email: 'google-ui@example.com' }, expiresAt: new Date(Date.now() + 86400000).toISOString() };
let failure = true;
const exchanges = [];
await context.route('**/api/auth/**', async route => {
  const action = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1);
  if (action === 'google-config') return route.fulfill({ json: { clientId: 'test.apps.googleusercontent.com' } });
  if (action === 'google-start') return route.fulfill({ json: { clientId: 'test.apps.googleusercontent.com', nonce } });
  if (action === 'google') {
    exchanges.push(route.request().postDataJSON());
    return route.fulfill({ status: failure ? 401 : 200, json: failure ? { error: 'Google could not verify this sign-in. Please try again.' } : session });
  }
  return route.fulfill({ json: session });
});
await context.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'text/javascript', body: `window.google={accounts:{id:{initialize(options){window.testGoogleOptions=options},renderButton(slot){const button=document.createElement('button');button.textContent='Continue with Google';button.onclick=()=>window.testGoogleOptions.callback({credential:'test-google-token'});slot.append(button)},disableAutoSelect(){window.googleSignedOut=true}}}};` }));
try {
  await page.goto('http://127.0.0.1:4173/login/');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('alert').getByText('Google could not verify this sign-in. Please try again.').waitFor();
  assert.equal(await page.getByRole('button', { name: 'SIGN IN', exact: true }).isEnabled(), true);
  failure = false;
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Grid view' }).waitFor();
  assert.equal(exchanges.length, 2);
  assert.deepEqual(exchanges[0], { idToken: 'test-google-token', nonce });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('exptrack-account')).user.id), session.user.id);
  await page.reload();
  await page.getByRole('button', { name: 'Grid view' }).waitFor();
  await page.goto('http://127.0.0.1:4173/settings/');
  await page.getByRole('button', { name: 'SIGN OUT', exact: true }).click();
  await page.getByRole('button', { name: 'SIGN IN', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Create an account', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Grid view' }).waitFor();
  assert.equal(exchanges.length, 3);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS (Brave): Google button on sign-in/sign-up, rejected token recovery, nonce exchange, session persistence, logout and mobile layout; Google responses mocked');
} finally { await browser.close(); }
