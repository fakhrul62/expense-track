import {chromium,expect as baseExpect} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
const expect=baseExpect.configure({timeout:45000}),native=process.argv.includes('--native'),base=process.env.ACCOUNT_TEST_URL??'http://localhost:3005';
const email=`exptrack-lending-${randomBytes(8).toString('hex')}@example.com`,password=randomBytes(18).toString('base64url');
let browser,page;let offline=false;const errors=[];
async function api(path,body,token){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://localhost','X-EXPTRACK-Client':'android',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
const money=n=>'৳ '+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
try{
 const session=await api('/api/auth/register/',{email,password,name:'Lending live test'}),now=new Date().toISOString(),date=now.slice(0,10);
 const change=(store,record)=>({store,id:record._id,record,mutationId:randomUUID()});
 const sync=mutations=>api('/api/sync/',{mutations},session.token);
 const salary='10000000-0000-4000-8000-000000000001',bank='10000000-0000-4000-8000-000000000006';
 await sync([...[ [salary,'Salary'],[bank,'Bank Balance'] ].map(([_id,name])=>change('categories',{_id,name:'Income: '+name,icon:'🏦',isDefault:false,createdAt:now,updatedAt:now})),...[ [salary,5000,'cash'],[bank,10000,'bank'] ].map(([categoryId,amount,source])=>change('expenses',{_id:randomUUID(),amount,categoryId,note:'EXTRACK-MONEY:1:'+JSON.stringify({note:'Starting funds',source}),date,createdAt:now,updatedAt:now}))]);
 browser=native?await chromium.connectOverCDP('http://127.0.0.1:9325',{noDefaults:true}):await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
 const ctx=native?browser.contexts()[0]:await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 if(native)await ctx.route('https://expense-track-lovat.vercel.app/**',async r=>{if(offline)return r.abort('internetdisconnected');const q=r.request(),res=await fetch(base+new URL(q.url()).pathname,{method:q.method(),headers:q.headers(),body:q.postDataBuffer()??undefined});return r.fulfill({status:res.status,headers:Object.fromEntries([...res.headers].filter(([k])=>!['content-encoding','content-length'].includes(k))),body:Buffer.from(await res.arrayBuffer())});});
 else await ctx.route('**/api/sync/**',r=>offline?r.abort('internetdisconnected'):r.continue());
 page=native?ctx.pages()[0]:await ctx.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
 if(native)await page.evaluate(async s=>{await window.Capacitor.Plugins.ExpenseStore.writeSession({value:JSON.stringify(s)});},session);
 else await ctx.addInitScript(s=>localStorage.setItem('exptrack-account',JSON.stringify(s)),session);
 await page.goto(native?'https://localhost/':base+'/');await expect(page.getByTestId('cash-balance')).toHaveText(money(5000));await expect(page.getByTestId('bank-balance')).toHaveText(money(10000));
 async function home(bank,cash){await page.getByRole('link',{name:'HOME',exact:true}).last().click();await expect(page.getByTestId('bank-balance')).toHaveText(money(bank));await expect(page.getByTestId('cash-balance')).toHaveText(money(cash));}
 async function loans(){await page.getByRole('link',{name:'LOANS',exact:true}).last().click();await page.getByRole('group',{name:'Filter loans'}).getByRole('button',{name:/^All/}).click();}
 const card=name=>page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})});
 async function add(direction,name,amount,source,existing=false){await page.getByRole('button',{name:'ADD LOAN',exact:true}).click();await page.getByRole('group',{name:'Loan type'}).getByRole('button',{name:direction==='lent'?'Lent':'Borrowed',exact:true}).click();await page.getByLabel(direction==='lent'?'Person I lent to':'Lender / borrowed from',{exact:true}).fill(name);if(existing)await page.getByRole('checkbox').check();else{const group=page.getByRole('group',{name:direction==='lent'?'SOURCE OF FUNDS':'ADD TO',exact:true});await expect(group.getByRole('button')).toHaveCount(2);await group.getByRole('button',{name:source,exact:true}).click();}await page.getByLabel('Amount (৳)',{exact:true}).fill(String(amount));await page.getByRole('button',{name:direction==='lent'?'SAVE LENDING':'SAVE LOAN',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);}
 async function pay(name,lent,amount,source,full=false){await card(name).getByRole('button',{name:lent?'COLLECT PAYMENT':'REPAY / CLEAR LOAN',exact:true}).click();if(full)await page.getByRole('button',{name:'CLEAR IN FULL',exact:true}).click();else await page.getByLabel('Amount (৳)',{exact:true}).fill(String(amount));await page.getByRole('group',{name:lent?'RECEIVE INTO':'PAY FROM',exact:true}).getByRole('button',{name:source,exact:true}).click();await page.getByRole('button',{name:full?lent?'CONFIRM FULL PAYMENT':'CONFIRM FULL REPAYMENT':lent?'SAVE PAYMENT RECEIVED':'SAVE REPAYMENT',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);}
 await loans();await add('borrowed','Bank borrowing',5000,'Bank Balance');await home(15000,5000);
 await loans();await add('lent','Bank lending',2000,'Bank Balance');await expect(page.getByTestId('receivable-total')).toHaveText(money(2000));await expect(page.getByTestId('loan-total')).toHaveText(money(5000));await home(13000,5000);
 await loans();await add('lent','Cash lending',1000,'Cash Balance');await expect(page.getByTestId('receivable-total')).toHaveText(money(3000));await home(13000,4000);await page.reload();await expect(page.getByTestId('cash-balance')).toHaveText(money(4000));
 await loans();await pay('Bank lending',true,500,'Cash Balance');await expect(page.getByTestId('receivable-total')).toHaveText(money(2500));await home(13000,4500);
 await loans();await pay('Bank lending',true,0,'Bank Balance',true);await home(14500,4500);
 await loans();await pay('Cash lending',true,0,'Cash Balance',true);await expect(page.getByTestId('receivable-total')).toHaveText(money(0));await home(14500,5500);
 console.log('PASS: Borrowed adds selected funds; bank/cash lending deducts only selected wallet; partial/full collections reduce receivables and credit selected wallet');
 await loans();await pay('Bank borrowing',false,2000,'Bank Balance');await expect(page.getByTestId('loan-total')).toHaveText(money(3000));await home(12500,5500);
 await loans();await pay('Bank borrowing',false,0,'Cash Balance',true);await expect(page.getByTestId('loan-total')).toHaveText(money(0));await home(12500,2500);
 await loans();await add('lent','Existing receivable',500,'Cash Balance',true);await home(12500,2500);
 await loans();await pay('Existing receivable',true,100,'Cash Balance');await expect(page.getByTestId('receivable-total')).toHaveText(money(400));await home(12500,2600);
 await loans();for(const name of ['Bank lending','Cash lending','Bank borrowing','Existing receivable']){await card(name).getByRole('button',{name:`Delete loan for ${name}`,exact:true}).click();await page.getByRole('button',{name:'YES, DELETE',exact:true}).click();await expect(card(name)).toHaveCount(0);}
 await home(10000,5000);
 // Store a new lending offline, survive reload, then upload it to the real server.
 offline=true;await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});window.dispatchEvent(new Event('offline'));});
 await loans();await add('lent','Offline cash lending',300,'Cash Balance');await home(10000,4700);assert(!(await sync([])).expenses.some(e=>e.note.includes('Offline cash lending')));await page.reload();await expect(page.getByTestId('cash-balance')).toHaveText(money(4700));
 offline=false;await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});window.dispatchEvent(new Event('online'));});await expect.poll(async()=>(await sync([])).expenses.some(e=>e.note.includes('Offline cash lending')),{timeout:60000}).toBe(true);
 assert.deepEqual(errors,[]);console.log(`PASS (${native?'Android SQLite':'browser IndexedDB'}, real local API): borrowing repayments, tracking-only receivables, loan deletion restores wallets, offline lending/reload/reconnect sync, no runtime errors`);
}finally{
 offline=false;
 if(native&&page)await page.evaluate(async()=>{await window.Capacitor.Plugins.ExpenseStore.writeSession({});await window.Capacitor.Plugins.LocalNotifications.cancel({notifications:Array.from({length:6},(_,i)=>({id:830+i}))});}).catch(()=>{});
 if(browser)await browser.close();await mongoose.connect(process.env.MONGODB_URI,{dbName:'expense_tracker'});const db=mongoose.connection.db,user=await db.collection('users').findOne({email});if(user){for(const name of ['auth_sessions','cloud_records','cloud_mutations','cloud_category_aliases','cloud_sync_state'])await db.collection(name).deleteMany({userId:user._id});await db.collection('users').deleteOne({_id:user._id});}await mongoose.disconnect();
}
