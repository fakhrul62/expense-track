import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real scheduling module with controlled permission/storage failures.
const storage = new Map(), pending = new Map();
let platform = 'android', permission = 'granted', permissionRequests = 0, failSchedule = false;
const notifications = {
  checkPermissions: async()=>({display:permission}),
  requestPermissions: async()=>{permissionRequests++; return {display:permission};},
  createChannel: async()=>{},
  cancel: async({notifications})=>{for(const n of notifications)pending.delete(n.id);},
  schedule: async({notifications})=>{if(failSchedule)throw new Error('schedule failed');for(const n of notifications)pending.set(n.id,n);},
};
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/daily-reminder.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
  exports, require:name=>name==='@capacitor/core'?{Capacitor:{getPlatform:()=>platform}}:{LocalNotifications:notifications},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
});
const s = exports;
assert.equal(await s.initializeDailyReminder('new'),'enabled');
assert.deepEqual([...pending.keys()],[830]);
assert.equal(pending.get(830).schedule.on.hour,20);
assert.equal(pending.get(830).schedule.on.minute,30);
await s.saveReminderSettings('new',{enabled:true,times:['09:15','13:00','21:45']});
assert.deepEqual([...pending.keys()],[830,831,832]);
assert.deepEqual([...pending.values()].map(n=>[n.schedule.on.hour,n.schedule.on.minute]),[[9,15],[13,0],[21,45]]);
for(const n of pending.values()){assert(n.schedule.repeats);assert.equal(n.smallIcon,'ic_stat_spending');assert.equal(n.largeIcon,'exptrack_notification');assert.equal(n.isExactNotification,false);}
await s.syncDailyReminder('new'); assert.equal(pending.size,3);
await s.saveReminderSettings('new',{enabled:true,times:['00:00']});
assert.deepEqual([...pending.keys()],[830]);assert.equal(pending.get(830).schedule.on.hour,0);
for(const times of [[],['24:00'],['09:60'],['9:00'],['09:00','09:00'],Array(7).fill('20:30')]) {
  assert.throws(()=>s.saveReminderSettings('new',{enabled:true,times}));
  assert.equal(pending.size,1);
}
await s.saveReminderSettings('new',{enabled:true,times:['01:00','05:00','09:00','13:00','17:00','21:00']});
assert.equal(pending.size,6);
await s.setDailyReminder('new',false);assert.equal(pending.size,0);assert.equal(s.getReminderSettings('new').times.length,6);
await s.setDailyReminder('new',true);assert.equal(pending.size,6);
await s.syncDailyReminder(null);assert.equal(pending.size,0);
storage.set('exptrack-reminder:legacy','off');
assert.equal(await s.initializeDailyReminder('legacy'),'disabled');assert.equal(pending.size,0);
await s.syncDailyReminder('new');assert.equal(pending.size,6);
permission='denied';
assert.equal(await s.syncDailyReminder('new'),'blocked');assert.equal(pending.size,0);
const before=permissionRequests;
await s.saveReminderSettings('new',{enabled:true,times:['10:00']});assert.equal(permissionRequests,before+1);
permission='granted';failSchedule=true;
await assert.rejects(s.syncDailyReminder('new'),/schedule failed/);
failSchedule=false;assert.equal(await s.syncDailyReminder('new'),'enabled');assert.equal(pending.size,1);
storage.set('exptrack-reminder-settings:broken','{"times":["99:99"]}');
assert.equal(s.getReminderSettings('broken').times[0],'20:30');
assert(s.isSpendingReminder(830));assert(s.isSpendingReminder(835));assert(!s.isSpendingReminder(836));
platform='web';assert.equal(await s.syncDailyReminder('new'),'unsupported');
console.log('PASS: legacy/default preferences, 1-6 custom times, midnight, validation, duplicate prevention, replacement, disable/logout cancellation, account isolation, permission denial, queue recovery, icon preservation and web fallback.');
