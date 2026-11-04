import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const native=process.argv.includes('--native');
const browser=native ? await chromium.connectOverCDP('http://127.0.0.1:9325',{noDefaults:true}) : await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
try{
 const page=native ? browser.contexts()[0].pages()[0] : await browser.newPage({viewport:{width:360,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const session={user:{id:'bbbbbbbbbbbbbbbbbbbbbbbb',name:'Income test',email:'income-test@example.com'},expiresAt:new Date(Date.now()+86400000).toISOString()};
 await page.route('**/api/auth/**',r=>r.fulfill({json:session}));
 const records=new Map();await page.route('**/api/sync/**',r=>{const {mutations}=r.request().postDataJSON();for(const m of mutations){if(m.deleted)records.delete(m.store+':'+m.id);else records.set(m.store+':'+m.id,m);}return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId),categories:[...records.values()].filter(m=>m.store==='categories').map(m=>m.record),expenses:[...records.values()].filter(m=>m.store==='expenses').map(m=>m.record),deleted:[],aliases:[],warnings:[]}});});
 if(native) await page.evaluate(async session=>{const store=window.Capacitor.Plugins.ExpenseStore;await store.setUser({id:session.user.id});const{records}=await store.list({store:'expenses'});for(const record of records)await store.remove({store:'expenses',id:record._id});await store.writeSession({value:JSON.stringify(session)});},session);
 else await page.addInitScript(s=>localStorage.setItem('exptrack-account',JSON.stringify(s)),session);
 await page.goto(native?'https://localhost':'http://localhost:3005');await page.getByRole('button',{name:'+ ADD MONEY',exact:true}).waitFor();
 async function add(income,amount,note){await(income?page.getByRole('button',{name:'+ ADD MONEY',exact:true}):page.getByRole('button',{name:'Add Expense',exact:true}).last()).click();await page.getByLabel('Amount',{exact:true}).fill(amount);await page.getByLabel('Note',{exact:true}).fill(note);await page.getByRole('button',{name:'SAVE',exact:true}).click();await page.getByText(note,{exact:true}).waitFor();}
 await add(true,'20000','Salary test');await add(false,'5000','Spending test');
 await expect(page.getByTestId('available-balance')).toHaveText('৳ 15,000.00');
 await page.reload();await expect(page.getByTestId('available-balance')).toHaveText('৳ 15,000.00');
 const row=page.locator('.expense-row').filter({hasText:'Salary test'});await expect(row).toContainText('+৳20000.00');await row.getByRole('button',{name:'Edit Income',exact:true}).click();await page.getByLabel('Amount',{exact:true}).fill('25000');await page.getByRole('button',{name:'UPDATE',exact:true}).click();await expect(page.getByTestId('available-balance')).toHaveText('৳ 20,000.00');
 await page.getByRole('button',{name:'Previous Month',exact:true}).click();await expect(page.getByTestId('available-balance')).toHaveText('৳ 20,000.00');await page.getByRole('button',{name:'Next Month',exact:true}).click();
 await row.getByRole('button',{name:'Delete Income',exact:true}).click();await page.getByRole('button',{name:'YES, DELETE',exact:true}).click();await expect(page.getByTestId('available-balance')).toHaveText('৳ -5,000.00');
 await page.getByRole('button',{name:'+ ADD MONEY',exact:true}).click();
 for(const name of ['Salary','Loan received','Owed money repaid','Freelance','Other money received']) await page.getByRole('button',{name:new RegExp(name)}).waitFor();
 await page.getByLabel('Amount',{exact:true}).fill('1000');await page.locator('input[type="date"]').fill('2099-01-01');await page.getByRole('button',{name:'SAVE',exact:true}).click();await expect(page.getByTestId('available-balance')).toHaveText('৳ -5,000.00');
 for (const source of ['Loan received','Owed money repaid','Freelance','Other money received']) {
   await page.getByRole('button',{name:'+ ADD MONEY',exact:true}).click();
   await page.getByRole('button',{name:new RegExp(source)}).click();
   await page.getByLabel('Amount',{exact:true}).fill('100');await page.getByLabel('Note',{exact:true}).fill(source+' check');await page.getByRole('button',{name:'SAVE',exact:true}).click();
   await page.locator('.expense-row').filter({hasText:source+' check'}).getByRole('button',{name:'Delete Income',exact:true}).click();await page.getByRole('button',{name:'YES, DELETE',exact:true}).click();
   await expect(page.getByTestId('available-balance')).toHaveText('\u09f3 -5,000.00');
 }
 await add(true,'20000','Salary preview');await expect(page.getByTestId('available-balance')).toHaveText('\u09f3 15,000.00');
 await page.getByRole('button',{name:'Grid view',exact:true}).click();await page.reload();await page.locator('[data-entry-view="grid"]').waitFor();await expect(page.getByTestId('available-balance')).toHaveText('\u09f3 15,000.00');
 await page.getByRole('button',{name:'List view',exact:true}).click();
 await page.evaluate(() => { localStorage.setItem('theme','dark');window.dispatchEvent(new Event('exptrack:theme')); });
 await expect(page.locator('html')).toHaveClass(/dark/);
 await expect.poll(() => page.locator('[aria-label="Your balance"]').evaluate(e => parseFloat(getComputedStyle(e).borderTopWidth))).toBeLessThanOrEqual(1);
 await expect.poll(() => page.getByTestId('available-balance').evaluate(e => getComputedStyle(e).color)).toBe('rgb(236, 237, 238)');
 await page.screenshot({path:native?'test-results/income-native.png':'test-results/income-dashboard.png',fullPage:!native});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log('PASS: income 20000 minus expense 5000, signs, reload, edit, delete, balance independent of month, narrow layout');
}finally{await browser.close();}
