import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const show = process.argv.includes('--show');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: !show });
const session = {user: {id:'cccccccccccccccccccccccc', name:'Loans preview (demo)', email:'loans-demo@example.com'}, expiresAt:new Date(Date.now()+7*86400000).toISOString()};
const records = new Map();
const errors = [];
async function context() {
  const ctx = await browser.newContext({viewport:{width:390,height:844}});
  await ctx.addInitScript(s => { if (location.origin !== 'http://localhost:3005') return; localStorage.setItem('exptrack-account',JSON.stringify(s)); localStorage.setItem('theme','dark'); }, session);
  await ctx.route('**/api/auth/**', r => r.fulfill({json:session}));
  await ctx.route('**/api/sync/**', r => {
    const {mutations} = r.request().postDataJSON();
    for (const m of mutations) {
      assert(['categories','expenses'].includes(m.store));
      if (m.record?.note) assert(m.record.note.length <= 500);
      if (m.deleted) records.delete(m.store+':'+m.id); else records.set(m.store+':'+m.id,m);
    }
    return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId), categories:[...records.values()].filter(m=>m.store==='categories').map(m=>m.record), expenses:[...records.values()].filter(m=>m.store==='expenses').map(m=>m.record), deleted:[],aliases:[],warnings:[]}});
  });
  ctx.on('page', p=>p.on('pageerror',e=>errors.push(e.message)));
  return ctx;
}
const ctx = await context();
const page = await ctx.newPage();
const base = 'http://localhost:3005';
const loan = name => page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})});
async function add(name, amount, existing=false) {
  await page.getByRole('button',{name:'ADD LOAN',exact:true}).click();
  await page.getByLabel('Lender / borrowed from').fill(name);
  await page.getByLabel('Amount (৳)',{exact:true}).fill(amount);
  if(existing) await page.getByRole('radio',{name:/Existing debt only/}).check();
  await page.getByRole('button',{name:'SAVE LOAN',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(loan(name)).toBeVisible();
}
try {
  await page.goto(`${base}/loans/`);
  await page.getByRole('button',{name:'ADD LOAN',exact:true}).waitFor();
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 0.00');
  await add('Bank loan','20000');
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 20,000.00');
  await page.getByRole('link',{name:'HOME',exact:true}).click();
  await expect(page.getByTestId('available-balance')).toHaveText('৳ 20,000.00');
  await expect(page.locator('.expense-row')).toContainText('Borrowed from Bank loan');
  await expect(page.locator('.expense-row').getByRole('button',{name:/Edit|Delete/})).toHaveCount(0);
  await page.getByRole('link',{name:'LOANS',exact:true}).last().click();
  await add('Old personal debt','5000',true);
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 25,000.00');
  await page.getByRole('link',{name:'HOME',exact:true}).click();
  await expect(page.getByTestId('available-balance')).toHaveText('৳ 20,000.00');
  await page.getByRole('link',{name:'LOANS',exact:true}).last().click();
  await loan('Bank loan').getByRole('button',{name:'REPAY / CLEAR LOAN',exact:true}).click();
  await page.getByLabel('Amount (৳)',{exact:true}).fill('4000.25');
  await page.getByRole('button',{name:'SAVE REPAYMENT',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(loan('Bank loan')).toContainText('৳ 15,999.75');
  await page.reload();
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 20,999.75');
  await loan('Bank loan').getByRole('button',{name:'REPAY / CLEAR LOAN',exact:true}).click();
  const repaymentAmount = page.getByLabel('Amount (৳)',{exact:true});
  for (const [value,flag] of [['20000','rangeOverflow'],['0','rangeUnderflow'],['1.001','stepMismatch']]) {
    await repaymentAmount.fill(value);
    await page.getByRole('button',{name:'SAVE REPAYMENT',exact:true}).click();
    assert(await repaymentAmount.evaluate((input,flag)=>input.validity[flag],flag));
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  await page.getByRole('button',{name:'Close loan form',exact:true}).click();
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 20,999.75');
  await page.getByRole('link',{name:'HOME',exact:true}).click();
  await expect(page.getByTestId('available-balance')).toHaveText('৳ 15,999.75');
  await page.getByRole('link',{name:'LOANS',exact:true}).last().click();
  await loan('Old personal debt').getByRole('button',{name:'REPAY / CLEAR LOAN',exact:true}).click();
  await page.getByRole('button',{name:'CLEAR IN FULL',exact:true}).click();
  await expect(page.getByLabel('Amount (৳)',{exact:true})).toHaveValue('5000');
  await page.getByRole('button',{name:'CONFIRM FULL REPAYMENT',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 15,999.75');
  await page.getByRole('button',{name:/^cleared \(/i}).click();
  await expect(loan('Old personal debt')).toContainText('CLEARED');
  await loan('Old personal debt').locator('summary').click();
  await expect(loan('Old personal debt').locator('li')).toHaveCount(1);
  await page.getByRole('link',{name:'HOME',exact:true}).click();
  await expect(page.getByTestId('available-balance')).toHaveText('৳ 10,999.75');
  // Legacy borrowing appears once in Loans and still counts as cash once.
  await page.getByRole('button',{name:'+ ADD MONEY',exact:true}).click();
  await page.getByRole('button',{name:/Loan received/}).click();
  await page.getByLabel('Amount',{exact:true}).fill('2500');
  await page.getByLabel('Note',{exact:true}).fill('Legacy loan');
  await page.getByRole('button',{name:'SAVE',exact:true}).click();
  await expect(page.getByTestId('available-balance')).toHaveText('৳ 13,499.75');
  await page.getByRole('link',{name:'LOANS',exact:true}).last().click();
  await expect(loan('Legacy loan')).toBeVisible();
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 18,499.75');
  // Offline repayment persists locally and reaches a second client on reconnect.
  await ctx.setOffline(true);
  await loan('Legacy loan').getByRole('button',{name:'REPAY / CLEAR LOAN',exact:true}).click();
  await page.getByLabel('Amount (৳)',{exact:true}).fill('499.75');
  await page.getByRole('button',{name:'SAVE REPAYMENT',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('loan-total')).toHaveText('৳ 18,000.00');
  await ctx.setOffline(false);
  await expect.poll(()=>[...records.values()].filter(m=>m.store==='expenses').length).toBe(6);
  const second = await context(); const secondPage = await second.newPage();
  await secondPage.goto(`${base}/loans/`);
  await expect(secondPage.getByTestId('loan-total')).toHaveText('৳ 18,000.00');
  await secondPage.getByRole('link',{name:'HOME',exact:true}).click();
  await expect(secondPage.getByTestId('available-balance')).toHaveText('৳ 13,000.00');
  await second.close();
  await page.getByRole('button',{name:/^all \(/i}).click();
  await mkdir('test-results',{recursive:true});
  for (const width of [320,390,1280]) {
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow at ${width}`);
    await page.screenshot({path:`test-results/loans-dark-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Toggle Theme',exact:true}).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect.poll(()=>page.getByTestId('loan-total').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(28, 25, 23)');
  await page.screenshot({path:'test-results/loans-light-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Toggle Theme',exact:true}).click();
  await page.setViewportSize({width:430,height:940});
  await page.getByRole('button',{name:/^active \(/i}).click();
  await expect.poll(()=>page.getByRole('button',{name:/^active \(/i}).evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(75, 54, 39)');
  await page.mouse.move(4,100);
  await expect.poll(()=>page.getByRole('button',{name:/^active \(/i}).evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(61, 45, 34)');
  await page.screenshot({path:'test-results/loans-preview.png',animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: borrowing increases cash; existing debt leaves cash unchanged; partial/full repayments deduct cash; cleared history; decimal amounts; reload; legacy loan; offline queue and two-client sync simulation; 320/390/1280 layouts; light/dark; no page errors.');
  if (show) { console.log('Interactive Brave demo left open at http://localhost:3005/loans/ (isolated demo account, simulated sync).'); await new Promise(resolve=>browser.on('disconnected',resolve)); }
} finally { await browser.close(); }
