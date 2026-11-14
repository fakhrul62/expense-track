// Real Android WebView/SQLite; only AppUpdater responses are controlled fixtures.
// No fake release is published or downloaded, and installer approval is not automated.
import {chromium,expect as baseExpect} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const expect=baseExpect.configure({timeout:30000});
const b=await chromium.connectOverCDP('http://127.0.0.1:9325',{noDefaults:true}),ctx=b.contexts()[0],p=ctx.pages()[0];p.setDefaultTimeout(30000);
const actual=await p.evaluate(()=>window.Capacitor.Plugins.AppUpdater.getState());
const session={user:{id:randomBytes(12).toString('hex'),name:'Update indicator check',email:'indicator@example.com'},expiresAt:new Date(Date.now()+86400000).toISOString()};
const records=new Map();await ctx.route('**/api/auth/**',r=>r.fulfill({json:session}));await ctx.route('**/api/sync/**',r=>{const mutations=r.request().postDataJSON().mutations;for(const m of mutations)if(!m.deleted)records.set(m.store+':'+m.id,m.record);return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId),categories:[...records].filter(([k])=>k.startsWith('categories:')).map(([,v])=>v),expenses:[],deleted:[],aliases:[],warnings:[]}});});
await p.evaluate(async s=>{await window.Capacitor.Plugins.ExpenseStore.writeSession({value:JSON.stringify(s)});},session);
await ctx.addInitScript(current=>{
 for(const key of Object.keys(localStorage))if(key.startsWith('exptrack:update-check:'))localStorage.removeItem(key);
 const q=window.__qcUpdates={mode:'available',calls:[],cache:{...current,available:false,ready:false,latestCode:current.currentCode,latestVersion:current.currentVersion},restores:[]};
 const intercept=cap=>{
  if(!cap||cap.__qcHook)return;Object.defineProperty(cap,'__qcHook',{value:true,configurable:true});let original=cap.nativePromise;
  const dispatch=async(plugin,method,...args)=>{
   if(plugin!=='AppUpdater'||!['getState','check','download','install','cancelDownload'].includes(method))return original.call(cap,plugin,method,...args);
   q.calls.push(method);
   if(method==='getState')return {...q.cache};
   if(method==='check'){
    await new Promise(r=>setTimeout(r,100));if(q.mode==='error')throw new Error('QC offline check');
    q.cache={...current,latestCode:current.currentCode+(q.mode==='available'?1:q.mode==='older'?-1:0),latestVersion:q.mode==='available'?'99.0.0-test':current.currentVersion,available:q.mode==='available',ready:false};return {...q.cache};
   }
   if(method==='download'){q.cache={...q.cache,ready:true};return {...q.cache};}
   if(method==='install')return {status:'permission'};
   return {};
  };
  Object.defineProperty(cap,'nativePromise',{configurable:true,enumerable:true,get:()=>dispatch,set:value=>{if(value!==dispatch)original=value;}});
  q.restores.push(()=>{Object.defineProperty(cap,'nativePromise',{value:original,writable:true,configurable:true,enumerable:true});delete cap.__qcHook;});
 };
 let cap=window.Capacitor;intercept(cap);Object.defineProperty(window,'Capacitor',{configurable:true,enumerable:true,get:()=>cap,set:value=>{cap=value;intercept(value);}});
 q.restore=()=>{for(const f of q.restores)f();Object.defineProperty(window,'Capacitor',{value:cap,configurable:true,writable:true,enumerable:true});};
},actual);
const config=()=>p.getByRole('navigation').getByRole('link',{name:/CONFIG/});const badge=()=>config().getByTestId('update-badge');
const calls=method=>p.evaluate(m=>window.__qcUpdates.calls.filter(v=>v===m).length,method);
try{
 await p.goto('https://localhost/');await p.getByTestId('cash-balance').waitFor();await expect(badge()).toBeVisible();assert.equal(await calls('check'),1);assert.equal(await calls('download'),0);assert.equal(await calls('install'),0);
 await expect(config()).toHaveAccessibleName(/Update available/);
 await p.evaluate(()=>{for(let i=0;i<4;i++){window.dispatchEvent(new Event('exptrack:resume'));window.dispatchEvent(new Event('online'));}});await expect(badge()).toBeVisible();assert.equal(await calls('check'),1);
 await config().click();await expect(p.getByRole('tab',{name:'Updates',exact:true})).toHaveAttribute('aria-selected','true');await expect(p.getByRole('heading',{name:'APP UPDATES',exact:true})).toBeVisible();await expect(p.getByText('VERSION 99.0.0-test AVAILABLE',{exact:true})).toBeVisible();
 await p.evaluate(()=>window.__qcUpdates.mode='same');await p.getByRole('button',{name:'CHECK FOR UPDATES',exact:true}).click();await expect(p.getByText('You’re up to date.',{exact:true})).toBeVisible();await expect(badge()).toHaveCount(0);
 await p.evaluate(()=>window.__qcUpdates.mode='older');await p.getByRole('button',{name:'CHECK FOR UPDATES',exact:true}).click();await expect(p.getByText('This version is newer than the published release.',{exact:true})).toBeVisible();await expect(badge()).toHaveCount(0);
 await p.evaluate(()=>window.__qcUpdates.mode='available');await p.getByRole('button',{name:'CHECK FOR UPDATES',exact:true}).click();await expect(badge()).toBeVisible();
  // Native state can change after the displayed candidate: re-read before downloading.
  await p.evaluate(()=>{const q=window.__qcUpdates;q.cache={...q.cache,available:false,latestCode:q.cache.currentCode};});await p.getByRole('button',{name:'DOWNLOAD & INSTALL',exact:true}).click();await expect(badge()).toHaveCount(0);assert.equal(await calls('download'),0);assert.equal(await calls('install'),0);
  await p.getByRole('button',{name:'CHECK FOR UPDATES',exact:true}).click();await expect(badge()).toBeVisible();
 await p.evaluate(()=>window.__qcUpdates.mode='error');await p.getByRole('button',{name:'CHECK FOR UPDATES',exact:true}).click();await expect(p.getByRole('region',{name:'APP UPDATES',exact:true}).getByRole('alert')).toContainText('QC offline check');await expect(badge()).toBeVisible();
 assert.equal(await calls('download'),0);await p.getByRole('button',{name:'DOWNLOAD & INSTALL',exact:true}).click();await expect(p.getByText(/Allow updates from EXPTRACK/)).toBeVisible();assert.equal(await calls('download'),1);assert.equal(await calls('install'),1);
 await p.getByRole('tab',{name:'Reminders',exact:true}).click();await p.getByLabel('Reminders per day').selectOption('3');await p.getByRole('tab',{name:'Updates',exact:true}).click();await p.getByRole('tab',{name:'Reminders',exact:true}).click();await expect(p.getByLabel('Reminders per day')).toHaveValue('3');
 await p.getByRole('tab',{name:'Account',exact:true}).click();await expect(p.getByRole('button',{name:'SIGN OUT',exact:true})).toBeVisible();await p.getByRole('tab',{name:'Categories',exact:true}).click();await expect(p.getByRole('heading',{name:'Expense Categories',exact:true})).toBeVisible();
 // A newly installed version clears the indicator on resume, even with a stale available flag.
 await p.evaluate(()=>{const q=window.__qcUpdates;q.cache={...q.cache,currentCode:q.cache.latestCode,available:true};window.dispatchEvent(new Event('exptrack:resume'));});await expect(badge()).toHaveCount(0);
 console.log('PASS (Android WebView/SQLite, controlled updater): automatic Home check/badge without Config, cooldown/dedup, equal/older/failed/new/installed states, no auto-download/install, manual approval flow, grouped tabs and unsaved reminder preservation');
}finally{
 await p.evaluate(async()=>{window.__qcUpdates?.restore?.();for(const key of Object.keys(localStorage))if(key.startsWith('exptrack:update-check:'))localStorage.removeItem(key);await window.Capacitor.Plugins.ExpenseStore.writeSession({});await window.Capacitor.Plugins.LocalNotifications.cancel({notifications:Array.from({length:6},(_,i)=>({id:830+i}))});}).catch(()=>{});
 await b.close();
}
