import {chromium,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const native=process.argv.includes('--native');
const browser=native?await chromium.connectOverCDP('http://127.0.0.1:9325',{noDefaults:true}):await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
const page=native?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
page.setDefaultTimeout(30000);
const session={user:{id:randomBytes(12).toString('hex'),email:'batch-test@example.com',name:'Batch test'},expiresAt:new Date(Date.now()+86400000).toISOString()};
const records=new Map(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/auth/**',r=>r.fulfill({json:session}));
await page.route('**/api/sync/**',r=>{const {mutations}=r.request().postDataJSON();for(const m of mutations)if(m.deleted)records.delete(m.store+':'+m.id);else records.set(m.store+':'+m.id,m.record);return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId),categories:[...records.entries()].filter(([k])=>k.startsWith('categories:')).map(([,v])=>v),expenses:[...records.entries()].filter(([k])=>k.startsWith('expenses:')).map(([,v])=>v),deleted:[],aliases:[],warnings:[]}});});
const base=native?'https://localhost':'http://localhost:3005';
let activeRow=1;
const open=async()=>{activeRow=1;await page.getByRole('navigation').getByRole('button',{name:'Add Expense',exact:true}).click();};
const addAnother=async()=>{await page.getByRole('button',{name:'+ Add Another',exact:true}).click();activeRow=await page.locator('[data-expense-key]').count();};
const field=name=>page.getByRole('dialog').getByRole('group',{name:`Expense ${activeRow}`,exact:true}).getByLabel(name,{exact:true});
async function fill(amount,note,category){await field('Amount').fill(amount);await field('Note').fill(note);if(category)await page.getByRole('dialog').getByRole('group',{name:`Expense ${activeRow}`,exact:true}).getByRole('button',{name:category,exact:true}).click();}
async function allRecords(){return page.evaluate(async native=>{
 if(native)return(await window.Capacitor.Plugins.ExpenseStore.list({store:'expenses'})).records;
 return new Promise((resolve,reject)=>{const request=indexedDB.open('exptrack-local');request.onsuccess=()=>{const db=request.result,r=db.transaction('expenses').objectStore('expenses').getAll();r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);};request.onerror=()=>reject(request.error);});
},native);}
try{
 if(native)await page.evaluate(async s=>{await window.Capacitor.Plugins.ExpenseStore.setUser({id:s.user.id});await window.Capacitor.Plugins.ExpenseStore.writeSession({value:JSON.stringify(s)});},session);
 else await page.addInitScript(s=>{if(location.origin!=='http://localhost:3005')return;localStorage.setItem('exptrack-account',JSON.stringify(s));},session);
 await page.goto(base+'/');await page.getByTestId('available-balance').waitFor();
 await open();
 await expect.poll(()=>page.getByRole('dialog').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBeGreaterThanOrEqual(24);
 const headerAction=await page.getByRole('button',{name:'+ Add Another',exact:true}).boundingBox(),closeAction=await page.getByRole('button',{name:'Close expense',exact:true}).boundingBox(),amountBox=await field('Amount').boundingBox();
 assert(headerAction.y<amountBox.y && headerAction.x+headerAction.width<=closeAction.x,'Add another remains in the header left of Close');
 await field('Amount').fill('0');await page.getByRole('button',{name:'+ Add Another',exact:true}).click();await expect(page.locator('.expense-stack-card')).toHaveCount(0);
 await fill('50','Morning bus','Bus');await addAnother();
 await fill('120','Lunch','Food');
 const yesterday=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
 await field('Date').fill(yesterday);
 await addAnother();await fill('35.50','Snack','Food');
 await expect(page.getByTestId('batch-total')).toHaveText('৳ 205.50');
 activeRow=1;await field('Amount').fill('60');await expect(page.getByTestId('batch-total')).toHaveText('৳ 215.50');
 await page.getByRole('button',{name:'Remove expense 3',exact:true}).click();
 await addAnother();await fill('40','Evening bus','Bus');
 await expect(page.getByTestId('batch-total')).toHaveText('৳ 220.00');
 if(!native){
  for(const width of [320,390]){await page.setViewportSize({width,height:700});for(const dark of [false,true]){await page.evaluate(d=>{localStorage.setItem('theme',d?'dark':'light');window.dispatchEvent(new Event('exptrack:theme'));},dark);await page.screenshot({path:`test-results/batch-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}}
 }
 await page.getByRole('button',{name:'SAVE ALL (3)',exact:true}).evaluate(button=>{button.click();button.click();});await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByTestId('available-balance')).toHaveText('৳ -220.00');assert.equal((await allRecords()).length,3);
 await page.reload();await expect(page.getByTestId('available-balance')).toHaveText('৳ -220.00');
 const lunch=page.locator('.expense-row').filter({hasText:'Lunch'});await lunch.getByRole('button',{name:'Edit Expense',exact:true}).click();activeRow=1;await expect(page.getByRole('button',{name:'+ Add Another',exact:true})).toHaveCount(0);await field('Amount').fill('150');await page.getByRole('button',{name:'UPDATE',exact:true}).click();await expect(page.getByTestId('available-balance')).toHaveText('৳ -250.00');
 await page.getByRole('button',{name:'+ ADD MONEY',exact:true}).click();await expect(page.getByRole('button',{name:'+ Add Another',exact:true})).toHaveCount(0);await field('Amount').fill('20000');await field('Note').fill('Test salary');await page.getByRole('button',{name:'SAVE',exact:true}).click();await expect(page.getByTestId('available-balance')).toHaveText('৳ 19,750.00');
 await open();await fill('10','Cancelled batch');await addAnother();await page.getByRole('button',{name:'CANCEL',exact:true}).click();assert.equal((await allRecords()).length,4);
 if(native){
  const rollback=await page.evaluate(async accountId=>{
   const store=window.Capacitor.Plugins.ExpenseStore,before=(await store.list({store:'expenses'})).records.length;
   const pendingBefore=JSON.stringify(await store.syncPending({accountId}));
   const now=new Date().toISOString(),record={_id:crypto.randomUUID(),amount:5,categoryId:'default-bus',note:'Must roll back',date:now.slice(0,10),createdAt:now,updatedAt:now};
   let rejected=false;try{await store.putBatch({accountId,records:[record,{...record,_id:crypto.randomUUID(),categoryId:crypto.randomUUID()}]});}catch{rejected=true;}
   return{rejected,before,after:(await store.list({store:'expenses'})).records.length,pendingUnchanged:pendingBefore===JSON.stringify(await store.syncPending({accountId}))};
  },session.user.id);
  assert(rollback.rejected);assert.equal(rollback.before,rollback.after);assert(rollback.pendingUnchanged);
 }else{
  await open();await fill('5','Atomic first','Bus');await addAnother();await fill('6','Atomic second','Food');
  const category=await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('exptrack-local');r.onsuccess=()=>{const db=r.result,tx=db.transaction('categories','readwrite'),store=tx.objectStore('categories'),read=store.get('default-food');let saved;read.onsuccess=()=>{saved=read.result;store.delete('default-food');};tx.oncomplete=()=>{db.close();resolve(saved);};};}));
  await page.getByRole('button',{name:'SAVE ALL (2)',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('category no longer exists');assert.equal((await allRecords()).length,4);
  await page.evaluate(category=>new Promise(resolve=>{const r=indexedDB.open('exptrack-local');r.onsuccess=()=>{const db=r.result,tx=db.transaction('categories','readwrite');tx.objectStore('categories').put(category);tx.oncomplete=()=>{db.close();resolve();};};}),category);
  await page.getByRole('button',{name:'SAVE ALL (2)',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);assert.equal((await allRecords()).length,6);await expect(page.getByTestId('available-balance')).toHaveText('৳ 19,739.00');
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS (${native?'native SQLite':'browser IndexedDB'}): compact multi-entry editing/removal, per-entry categories/dates/notes, accurate totals, no duplicate double-submit, reload, ordinary edit/income preserved, cancel, and atomic rollback.`);
}finally{await browser.close();}
