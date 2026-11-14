import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:45000});
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
const native=process.argv.includes('--native'),base=process.env.ACCOUNT_TEST_URL??'http://localhost:3005';
const email=`exptrack-qc-ui-${randomBytes(8).toString('hex')}@example.com`,password=randomBytes(18).toString('base64url');
let browser,page;
async function api(path,body,token){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://localhost','X-EXPTRACK-Client':'android',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
try{
 const session=await api('/api/auth/register/',{email,password,name:'QC UI recovery'}),now=new Date().toISOString(),date=now.slice(0,10),lid=randomUUID(),pid=randomUUID();
 const cat=(_id,name)=>({_id,name,icon:'🤝',isDefault:false,createdAt:now,updatedAt:now});
 const loan='10000000-0000-4000-8000-000000000002',repay='20000000-0000-4000-8000-000000000001';
 const exp=(_id,categoryId,amount,details)=>({_id,categoryId,amount,note:'EXTRACK-LOAN:1:'+JSON.stringify(details),date,createdAt:now,updatedAt:now});
 const change=(store,record)=>({store,id:record._id,record,mutationId:randomUUID()});
 const sync=mutations=>api('/api/sync/',{mutations},session.token);
 await sync([change('categories',cat(loan,'Income: Loan received')),change('categories',cat(repay,'Loan repayment')),change('expenses',exp(lid,loan,1000,{kind:'loan',lender:'QC lender',note:''}))]);
 await sync([{store:'expenses',id:lid,deleted:true,mutationId:randomUUID()}]);
 await sync([change('expenses',exp(pid,repay,100,{kind:'payment',lender:'QC lender',note:'Review recovered payment',loanId:lid,source:'cash'}))]);
 browser=native?await chromium.connectOverCDP('http://127.0.0.1:9325',{noDefaults:true}):await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
 const ctx=native?browser.contexts()[0]:await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 if(native)await ctx.route('https://expense-track-lovat.vercel.app/**',async r=>{const q=r.request(),res=await fetch(base+new URL(q.url()).pathname,{method:q.method(),headers:q.headers(),body:q.postDataBuffer()??undefined});return r.fulfill({status:res.status,headers:Object.fromEntries([...res.headers].filter(([k])=>!['content-encoding','content-length'].includes(k))),body:Buffer.from(await res.arrayBuffer())});});
 page=native?ctx.pages()[0]:await ctx.newPage();page.setDefaultTimeout(45000);
 if(native)await page.evaluate(async s=>{await window.Capacitor.Plugins.ExpenseStore.writeSession({value:JSON.stringify(s)});},session);
 else await ctx.addInitScript(s=>localStorage.setItem('exptrack-account',JSON.stringify(s)),session);
 await page.goto(native?'https://localhost/':base+'/');await expect(page.getByTestId('cash-balance')).toHaveText('৳ -100.00');
 const row=page.locator('.expense-row').filter({hasText:'Review recovered payment'});
 await row.getByRole('button',{name:'Edit Expense',exact:true}).click();await page.getByLabel('Amount',{exact:true}).fill('75');await page.getByRole('button',{name:'UPDATE',exact:true}).click();await expect(page.getByTestId('cash-balance')).toHaveText('৳ -75.00');
 await row.getByRole('button',{name:'Delete Expense',exact:true}).focus();await row.getByRole('button',{name:'Delete Expense',exact:true}).click();
 await expect(page.getByRole('button',{name:'CANCEL',exact:true})).toBeFocused();
 for(let i=0;i<12;i++){await page.keyboard.press(i%3?'Tab':'Shift+Tab');assert(await page.evaluate(()=>!!document.activeElement?.closest('[role="dialog"]')));}
 assert(await page.evaluate(()=>{const background=document.querySelector('header');return !!background?.closest('[inert]');}));
 await page.getByRole('button',{name:'CANCEL',exact:true}).click();await expect(row.getByRole('button',{name:'Delete Expense',exact:true})).toBeFocused();
 await row.getByRole('button',{name:'Delete Expense',exact:true}).click();await page.getByRole('button',{name:'YES, DELETE',exact:true}).click();await expect(page.getByTestId('cash-balance')).toHaveText('৳ 0.00');
 await expect.poll(async()=>(await sync([])).expenses.some(e=>e._id===pid),{timeout:45000}).toBe(false);
 await page.getByRole('navigation').getByRole('button',{name:'Add Expense',exact:true}).click();await page.getByLabel('Amount',{exact:true}).fill('1');await page.getByLabel('Note',{exact:true}).fill('a'.repeat(500));await expect(page.getByLabel('Note',{exact:true})).toHaveAttribute('aria-invalid','true');await expect(page.getByRole('button',{name:'SAVE',exact:true})).toBeDisabled();await page.getByLabel('Note',{exact:true}).fill('"'.repeat(250));await expect(page.getByRole('button',{name:'SAVE',exact:true})).toBeDisabled();await page.getByLabel('Note',{exact:true}).fill('Valid note');await expect(page.getByRole('button',{name:'SAVE',exact:true})).toBeEnabled();await page.getByRole('button',{name:'CANCEL',exact:true}).click();
 await page.getByRole('link',{name:'CONFIG',exact:true}).last().click();await page.getByRole('tab',{name:'Categories',exact:true}).click();await page.locator('main').getByRole('button',{name:'ADD',exact:true}).click();await page.getByLabel('Category name',{exact:true}).fill('iNcOmE: Salary');await page.getByRole('button',{name:'ADD CATEGORY',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('This name is reserved for income sources.');await page.getByRole('button',{name:'Close category',exact:true}).click();
 console.log(`PASS (${native?'Android SQLite':'browser IndexedDB'}, real API): recovered repayment edit/delete, correct balance, safe Cancel focus/trap/inert/restore, serialized note feedback and reserved-name form rejection`);
}finally{
 if(native&&page)await page.evaluate(async()=>{await window.Capacitor.Plugins.ExpenseStore.writeSession({});await window.Capacitor.Plugins.LocalNotifications.cancel({notifications:Array.from({length:6},(_,i)=>({id:830+i}))});}).catch(()=>{});
 if(browser)await browser.close();
 await mongoose.connect(process.env.MONGODB_URI,{dbName:'expense_tracker'});const db=mongoose.connection.db,user=await db.collection('users').findOne({email});
 if(user){for(const name of ['auth_sessions','cloud_records','cloud_mutations','cloud_category_aliases','cloud_sync_state'])await db.collection(name).deleteMany({userId:user._id});await db.collection('users').deleteOne({_id:user._id});}await mongoose.disconnect();
}
