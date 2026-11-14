import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const b=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true}),ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await ctx.newPage();
const session={user:{id:randomBytes(12).toString('hex'),name:'Settings check',email:'settings@example.com'},expiresAt:new Date(Date.now()+86400000).toISOString()};
await ctx.addInitScript(s=>localStorage.setItem('exptrack-account',JSON.stringify(s)),session);
await ctx.route('**/api/auth/**',r=>r.fulfill({json:session}));const records=new Map();
await ctx.route('**/api/sync/**',r=>{const mutations=r.request().postDataJSON().mutations;for(const m of mutations)if(!m.deleted)records.set(m.store+':'+m.id,m.record);return r.fulfill({json:{acknowledged:mutations.map(m=>m.mutationId),categories:[...records].filter(([k])=>k.startsWith('categories:')).map(([,v])=>v),expenses:[],deleted:[],aliases:[],warnings:[]}});});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://localhost:3005/settings/');
 const tabs=p.getByRole('tablist',{name:'Settings sections'});
 await expect(tabs.getByRole('tab')).toHaveText(['Updates','Appearance','Reminders','Account','Categories']);
 await expect(p.getByRole('tab',{name:'Updates',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(p.getByRole('tabpanel')).toHaveCount(1);await expect(p.getByRole('heading',{name:'APP UPDATES',exact:true})).toBeVisible();
 await expect(p.getByRole('heading',{name:'YOUR ACCOUNT',exact:true})).toHaveCount(0);assert.equal(await p.getByTestId('update-badge').count(),0);
 await p.getByRole('tab',{name:'Updates',exact:true}).focus();await p.keyboard.press('ArrowRight');await expect(p.getByRole('tab',{name:'Appearance',exact:true})).toBeFocused();await expect(p.getByRole('group',{name:'Choose appearance'})).toBeVisible();
 await p.getByRole('group',{name:'Choose appearance'}).getByRole('button',{name:/^Garden/}).click();
 await p.getByRole('tab',{name:'Appearance',exact:true}).focus();await p.keyboard.press('End');await expect(p.getByRole('tab',{name:'Categories',exact:true})).toBeFocused();
 await p.locator('main').getByRole('button',{name:'ADD',exact:true}).click();await p.getByLabel('Category name',{exact:true}).fill('Settings category');await p.getByRole('button',{name:'ADD CATEGORY',exact:true}).click();await expect(p.getByRole('dialog')).toHaveCount(0);await expect(p.getByText('Settings category',{exact:true})).toBeVisible();
 await p.getByRole('tab',{name:'Categories',exact:true}).focus();await p.keyboard.press('Home');await expect(p.getByRole('tab',{name:'Updates',exact:true})).toBeFocused();
 for(const [name,heading]of [['Updates','APP UPDATES'],['Appearance','Appearance'],['Reminders','SPENDING REMINDERS'],['Account','YOUR ACCOUNT'],['Categories','Expense Categories']]){await p.getByRole('tab',{name,exact:true}).click();await expect(p.getByRole('heading',{name:heading,exact:true})).toBeVisible();await expect(p.getByRole('tabpanel')).toHaveCount(1);}
 await p.getByRole('tab',{name:'Account',exact:true}).click();await expect(p.getByRole('button',{name:'SIGN OUT',exact:true})).toBeVisible();await expect(p.getByRole('heading',{name:'CLOUD SYNC',exact:true})).toBeVisible();
 await p.getByRole('tab',{name:'Appearance',exact:true}).click();await expect(p.locator('html')).toHaveAttribute('data-look','garden');
 for(const width of [320,390,900]){await p.setViewportSize({width,height:844});for(const tab of ['Updates','Appearance','Reminders','Account','Categories']){await p.getByRole('tab',{name:tab,exact:true}).click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${tab} overflow`);}}
 await p.reload();await expect(p.getByRole('tab',{name:'Updates',exact:true})).toHaveAttribute('aria-selected','true');assert.deepEqual(errors,[]);
 console.log('PASS: updater first/default, five isolated accessible settings tabs, arrow/Home/End navigation, categories, appearance persistence, account/sync access, 320/390/900 layouts and no web update badge');
}finally{await b.close();}
