import { chromium, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

// Run on a debug emulator WebView forwarded to localhost:9325.
// Uses a fresh local account and intercepts auth/sync; never writes production data.
const browser = await chromium.connectOverCDP('http://127.0.0.1:9325', {noDefaults:true});
const page = browser.contexts()[0].pages()[0];
const session = {user:{id:randomBytes(12).toString('hex'),name:'Native loans test',email:'native-loans@example.com'},expiresAt:new Date(Date.now()+86400000).toISOString()};
const records = new Map();
const errors = [];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/auth/**',r=>r.fulfill({json:session}));
await page.route('**/api/sync/**',r=>{
  const {mutations}=r.request().postDataJSON();
  for(const m of mutations) if(m.deleted) records.delete(m.store+':'+m.id); else records.set(m.store+':'+m.id,m.record);
  return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId),categories:[...records.entries()].filter(([k])=>k.startsWith('categories:')).map(([,v])=>v),expenses:[...records.entries()].filter(([k])=>k.startsWith('expenses:')).map(([,v])=>v),deleted:[],aliases:[],warnings:[]}});
});
try {
  await page.evaluate(async s=>{const store=window.Capacitor.Plugins.ExpenseStore;await store.setUser({id:s.user.id});await store.writeSession({value:JSON.stringify(s)});},session);
  await page.goto('https://localhost/loans/');
  async function add(lender,amount,existing=false){
    await page.getByRole('button',{name:'ADD LOAN',exact:true}).click();
    await page.getByLabel('Lender / borrowed from').fill(lender);
    await page.getByLabel('Amount (৳)',{exact:true}).fill(amount);
    if(existing) await page.getByRole('radio',{name:/Existing debt only/}).check();
    await page.getByRole('button',{name:'SAVE LOAN',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await add('Native new borrowing','20000');
  await add('Native existing debt','5000',true);
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 25,000.00');
  await page.getByRole('link',{name:'HOME',exact:true}).click();
  await expect(page.getByTestId('available-balance')).toHaveText('৳ 20,000.00');
  await page.getByRole('link',{name:'LOANS',exact:true}).last().click();
  const borrowing=page.locator('article').filter({hasText:'Native new borrowing'});
  await borrowing.getByRole('button',{name:'REPAY / CLEAR LOAN'}).click();
  await page.getByLabel('Amount (৳)',{exact:true}).fill('4000');
  await page.getByRole('button',{name:'SAVE REPAYMENT',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 21,000.00');
  const oldDebt=page.locator('article').filter({hasText:'Native existing debt'});
  await oldDebt.getByRole('button',{name:'REPAY / CLEAR LOAN'}).click();
  await page.getByRole('button',{name:'CLEAR IN FULL',exact:true}).click();
  await page.getByRole('button',{name:'CONFIRM FULL REPAYMENT',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 16,000.00');
  await page.getByRole('link',{name:'HOME',exact:true}).click();
  await expect(page.getByTestId('available-balance')).toHaveText('৳ 11,000.00');
  const saved=await page.evaluate(async()=> (await window.Capacitor.Plugins.ExpenseStore.list({store:'expenses'})).records);
  assert.equal(saved.length,4); // Two loans, two repayments; no duplicate cash records.
  assert.deepEqual(errors,[]);
  await page.getByRole('link',{name:'LOANS',exact:true}).last().click();
  console.log('PASS: native SQLite borrowing, existing debt, partial/full repayment, reload, cash totals and bundled /loans route; auth/sync simulated.');
} finally { await browser.close(); }
