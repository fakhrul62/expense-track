import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
try {
 const page=await browser.newPage({viewport:{width:360,height:780}});
 const session={user:{id:'cccccccccccccccccccccccc',name:'Compatibility test',email:'compatibility@example.com'},expiresAt:new Date(Date.now()+86400000).toISOString()};
 await page.addInitScript(session=>{Object.defineProperty(AbortSignal,'any',{configurable:true,value:undefined});localStorage.setItem('exptrack-account',JSON.stringify(session));},session);
 await page.route('**/api/auth/**',r=>r.fulfill({json:session}));
 const records=new Map();let requests=0;
 await page.route('**/api/sync/**',r=>{requests++;const {mutations}=r.request().postDataJSON();for(const m of mutations){const key=`${m.store}:${m.id}`;if(m.deleted)records.delete(key);else records.set(key,{store:m.store,record:m.record});}return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId),categories:[...records.values()].filter(m=>m.store==='categories').map(m=>m.record),expenses:[...records.values()].filter(m=>m.store==='expenses').map(m=>m.record),deleted:[],aliases:[],warnings:[]}});});
 await page.goto('http://127.0.0.1:4173/');
 await page.getByRole('status').filter({hasText:'Synced to your account'}).waitFor();
 assert.equal(await page.evaluate(()=>typeof AbortSignal.any),'undefined');
 await page.getByRole('button',{name:'Add Expense',exact:true}).last().click();
 await page.getByLabel('Amount',{exact:true}).fill('18.25');await page.getByLabel('Note',{exact:true}).fill('WebView compatibility entry');await page.getByRole('button',{name:'SAVE',exact:true}).click();
 await expect.poll(()=>[...records.values()].filter(m=>m.store==='expenses').length).toBe(1);
 await page.getByRole('status').filter({hasText:'Synced to your account'}).waitFor();assert(requests>=2);
 console.log('PASS: initial and expense-upload sync without AbortSignal.any (provider responses mocked)');
}finally{await browser.close();}
