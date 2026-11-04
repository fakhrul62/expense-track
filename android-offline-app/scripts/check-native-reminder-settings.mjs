import { chromium, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

// Debug emulator WebView forwarded to :9325. Auth/sync are intercepted.
const browser=await chromium.connectOverCDP('http://127.0.0.1:9325',{noDefaults:true});
const page=browser.contexts()[0].pages()[0];
page.setDefaultTimeout(30000);
const session={user:{id:randomBytes(12).toString('hex'),name:'Reminder test',email:'reminder-test@example.com'},expiresAt:new Date(Date.now()+86400000).toISOString()};
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/auth/**',r=>r.fulfill({json:session}));
await page.route('**/api/sync/**',r=>r.fulfill({json:{acknowledged:r.request().postDataJSON().mutations.map(m=>m.mutationId),categories:[],expenses:[],deleted:[],aliases:[],warnings:[]}}));
const pending=()=>page.evaluate(async()=> (await window.Capacitor.Plugins.LocalNotifications.getPending()).notifications.filter(n=>n.id>=830&&n.id<836).sort((a,b)=>a.id-b.id));
async function count(value){await expect.poll(async()=>(await pending()).length).toBe(value);}
async function save(){await page.getByRole('button',{name:'SAVE REMINDER TIMES',exact:true}).click();await expect(page.getByRole('button',{name:'SAVE REMINDER TIMES',exact:true})).toBeDisabled();}
try {
 await page.evaluate(async s=>{await window.Capacitor.Plugins.ExpenseStore.setUser({id:s.user.id});await window.Capacitor.Plugins.ExpenseStore.writeSession({value:JSON.stringify(s)});},session);
 await page.goto('https://localhost/settings/');
 const reminders=page.getByRole('region',{name:'SPENDING REMINDERS'});
 await reminders.getByRole('switch',{name:'REMINDER ON',exact:true}).waitFor();
 await count(1);await expect(page.getByLabel('Reminder 1',{exact:true})).toHaveValue('20:30');
 await expect(page.locator('header a[href="/settings"]')).toBeHidden();
 await page.getByLabel('Reminders per day').selectOption('3');
 for(const [index,time] of ['09:15','13:00','21:45'].entries())await page.getByLabel(`Reminder ${index+1}`,{exact:true}).fill(time);
 await save();await count(3);
 assert.deepEqual((await pending()).map(n=>[n.schedule.on.hour,n.schedule.on.minute]),[[9,15],[13,0],[21,45]]);
 await page.getByLabel('Reminder 2',{exact:true}).fill('09:15');
 await page.getByRole('button',{name:'SAVE REMINDER TIMES',exact:true}).click();
 await expect(reminders.getByRole('alert')).toHaveText('Choose a different time for each reminder.');await count(3);
 await page.getByLabel('Reminders per day').selectOption('1');
 await page.getByLabel('Reminder 1',{exact:true}).fill('10:10');
 await save();await count(1);
 await page.reload();
 await expect(page.getByLabel('Reminder 1',{exact:true})).toHaveValue('10:10');
 await expect(page.getByLabel('Reminders per day')).toHaveValue('1');await count(1);
 await page.getByLabel('Reminders per day').selectOption('6');await save();await count(6);
 await reminders.getByRole('switch').click();await reminders.getByRole('switch',{name:'ENABLE REMINDER',exact:true}).waitFor();await count(0);
 await page.reload();await reminders.getByRole('switch',{name:'ENABLE REMINDER',exact:true}).waitFor();await count(0);
 await reminders.getByRole('switch').click();await reminders.getByRole('switch',{name:'REMINDER ON',exact:true}).waitFor();await count(6);
 await reminders.scrollIntoViewIfNeeded();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto('https://localhost/settings/');
 await page.getByRole('button',{name:'SIGN OUT',exact:true}).click();
 await page.getByRole('button',{name:'SIGN IN',exact:true}).waitFor();await count(0);
 assert.deepEqual(errors,[]);
 console.log('PASS: native 1/3/6 daily alarms, chosen times, duplicate rejection, stale alarm removal, reload persistence, off/on, logout cancellation, compact phone layout and no top Config icon.');
} finally {await browser.close();}
