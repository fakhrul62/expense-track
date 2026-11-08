import {chromium,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const native=process.argv.includes('--native');
const browser=native?await chromium.connectOverCDP('http://127.0.0.1:9325',{noDefaults:true}):await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
const context=native?browser.contexts()[0]:await browser.newContext({viewport:{width:390,height:844}}),page=native?context.pages()[0]:await context.newPage();
page.setDefaultTimeout(30000);
const session={user:{id:randomBytes(12).toString('hex'),name:'Loan directions test',email:'loan-directions@example.com'},expiresAt:new Date(Date.now()+86400000).toISOString()},records=new Map(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/api/auth/**',r=>r.fulfill({json:session}));
await context.route('**/api/sync/**',r=>{const{mutations}=r.request().postDataJSON();for(const m of mutations)if(m.deleted)records.delete(m.store+':'+m.id);else records.set(m.store+':'+m.id,m.record);return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId),categories:[...records].filter(([k])=>k.startsWith('categories:')).map(([,v])=>v),expenses:[...records].filter(([k])=>k.startsWith('expenses:')).map(([,v])=>v),deleted:[],aliases:[],warnings:[]}});});
const base=native?'https://localhost':'http://localhost:3005';
const view=name=>page.getByRole('group',{name:'Filter loans'}).getByRole('button',{name:new RegExp('^'+name+' \\(')}).click();
const row=name=>page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})});
async function cash(expected){await page.getByRole('link',{name:'HOME',exact:true}).click();await expect(page.getByTestId('available-balance')).toHaveText('৳ '+expected);await page.getByRole('link',{name:'LOANS',exact:true}).last().click();}
async function add(name,amount,lent=false,existing=false){await page.getByRole('button',{name:'ADD LOAN',exact:true}).click();await page.getByRole('group',{name:'Loan type'}).getByRole('button',{name:lent?/Owed to Me/:/I Owe/}).click();await page.getByLabel(lent?'Person I lent to':'Lender / borrowed from').fill(name);await page.getByLabel('Amount (৳)',{exact:true}).fill(amount);if(existing)await page.getByRole('radio',{name:/Existing debt only/}).check();await page.getByRole('button',{name:'SAVE LOAN',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);}
async function pay(name,amount,lent=false,full=false){await row(name).getByRole('button',{name:lent?'RECORD INSTALLMENT / PAYMENT':'REPAY / CLEAR LOAN',exact:true}).click();if(full)await page.getByRole('button',{name:'CLEAR IN FULL',exact:true}).click();else await page.getByLabel('Amount (৳)',{exact:true}).fill(amount);await page.getByRole('button',{name:full?lent?'CONFIRM FULL PAYMENT':'CONFIRM FULL REPAYMENT':lent?'SAVE PAYMENT RECEIVED':'SAVE REPAYMENT',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);}
try{
 if(native)await page.evaluate(async s=>{await window.Capacitor.Plugins.ExpenseStore.setUser({id:s.user.id});await window.Capacitor.Plugins.ExpenseStore.writeSession({value:JSON.stringify(s)});},session);else await context.addInitScript(s=>{if(location.origin==='http://localhost:3005')localStorage.setItem('exptrack-account',JSON.stringify(s));},session);
 await page.goto(base+'/loans/');
 await add('Bank borrowed','20000');await cash('20,000.00');
 await add('Friend lent','5000',true);await expect(row('Friend lent')).toBeVisible();await view('Active');await expect(row('Friend lent')).toHaveCount(0);await view('Owed to Me');await expect(row('Friend lent')).toBeVisible();await expect(page.getByTestId('loan-total')).toHaveText('৳ 5,000.00');await cash('15,000.00');
 await view('Owed to Me');await pay('Friend lent','1000.25',true);await expect(page.getByTestId('loan-total')).toHaveText('৳ 3,999.75');await page.reload();await view('Owed to Me');await expect(row('Friend lent')).toContainText('৳ 3,999.75');await cash('16,000.25');
 await pay('Bank borrowed','2000');await cash('14,000.25');
 await view('All');await expect(page.getByTestId('loan-total')).toHaveText('৳ 18,000.00');await expect(page.getByTestId('lent-total')).toHaveText('৳ 3,999.75');
 await view('Owed to Me');await add('Old lending','2500',true,true);await cash('14,000.25');
 await view('Owed to Me');await pay('Friend lent','',true,true);await expect(row('Friend lent')).toHaveCount(0);await view('Cleared');await expect(row('Friend lent')).toContainText('OWED TO ME');await cash('18,000.00');
 await view('Owed to Me');await pay('Old lending','500',true);await cash('18,500.00');
 // Legacy income receipt must stay a single borrowed loan.
 await page.getByRole('link',{name:'HOME',exact:true}).click();await page.getByRole('button',{name:'+ ADD MONEY',exact:true}).click();await page.getByRole('button',{name:/Loan received/}).click();await page.getByLabel('Amount',{exact:true}).fill('100');await page.getByLabel('Note',{exact:true}).fill('Legacy borrowing');await page.getByRole('button',{name:'SAVE',exact:true}).click();await expect(page.getByTestId('available-balance')).toHaveText('৳ 18,600.00');await page.getByRole('link',{name:'LOANS',exact:true}).last().click();await expect(row('Legacy borrowing')).toContainText('I OWE');
 await view('Owed to Me');await expect(row('Old lending')).toContainText('৳ 2,000.00');
 await mkdir('test-results',{recursive:true});
 if(!native){for(const width of[320,390]){await page.setViewportSize({width,height:844});for(const dark of[false,true]){await page.evaluate(d=>{localStorage.setItem('theme',d?'dark':'light');window.dispatchEvent(new Event('exptrack:theme'));},dark);await page.screenshot({path:`test-results/loan-directions-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}}}
 await page.getByRole('button',{name:'ADD LOAN',exact:true}).click();await page.getByRole('group',{name:'Loan type'}).getByRole('button',{name:/Owed to Me/}).click();await page.screenshot({path:native?'test-results/loan-directions-native-form.png':'test-results/loan-directions-form.png',animations:'disabled'});await page.getByRole('button',{name:'Close loan form'}).click();
 if(!native){
  await context.setOffline(true);await add('Offline lent','300',true);await expect(row('Offline lent')).toBeVisible();await context.setOffline(false);
  await expect.poll(()=>[...records.values()].filter(r=>r.note?.includes('Offline lent')).length).toBe(1);
  const second=await browser.newContext({viewport:{width:390,height:844}});
  await second.addInitScript(s=>{if(location.origin==='http://localhost:3005')localStorage.setItem('exptrack-account',JSON.stringify(s));},session);
  await second.route('**/api/auth/**',r=>r.fulfill({json:session}));
  await second.route('**/api/sync/**',r=>{const {mutations}=r.request().postDataJSON();for(const m of mutations)if(m.record)records.set(m.store+':'+m.id,m.record);return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId),categories:[...records].filter(([k])=>k.startsWith('categories:')).map(([,v])=>v),expenses:[...records].filter(([k])=>k.startsWith('expenses:')).map(([,v])=>v),deleted:[],aliases:[],warnings:[]}});});
  const other=await second.newPage();await other.goto(base+'/loans/');await other.getByRole('group',{name:'Filter loans'}).getByRole('button',{name:/^Owed to Me/}).click();await expect(other.getByRole('heading',{name:'Offline lent',exact:true})).toBeVisible();await expect(other.getByTestId('loan-total')).toHaveText('৳ 2,300.00');await second.close();
 }
 assert.deepEqual(errors,[]);console.log(`PASS (${native?'SQLite':'IndexedDB'}): borrow/lend tabs, direction filters, partial/full payments, mixed totals, cash flows, existing lending without duplicate cash, reload, legacy borrowing and mobile layouts.`);
}finally{await browser.close();}
