import ts from 'typescript';import vm from 'node:vm';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const cache=new Map();function load(path){if(cache.has(path))return cache.get(path);const exports={};cache.set(path,exports);const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(source,{exports,require:name=>load(name.replace('@/','src/')+'.ts')});return exports;}
const {encodeMoney,moneyDetails,paymentSource,walletBalances,BANK_CATEGORY}=load('src/lib/wallet.ts');
const {periodRange,makeReport,reportCSV,reportHTML}=load('src/lib/reports.ts');
const {encodeLoan,LOAN_CATEGORY,LENT_CATEGORY}=load('src/lib/loan-ledger.ts');
const entry=(id,amount,cat,date,note='')=>({_id:id,amount,categoryId:{_id:cat,name:'Example',icon:'',isDefault:false},date,note});
const salary='10000000-0000-4000-8000-000000000001';
const entries=[entry('opening',20000,BANK_CATEGORY,'2026-10-31'),entry('cash',5000,salary,'2026-11-09'),entry('card',1200,'default-food','2026-11-10',encodeMoney('Card food','bank')),entry('bus',50,'default-bus','2026-11-11'),entry('future',900,'default-bus','2026-12-01'),entry('existing',8000,LOAN_CATEGORY,'2026-11-09',encodeLoan({kind:'loan',lender:'Bank',note:'',received:false,source:'bank'})),entry('borrow',1000,LOAN_CATEGORY,'2026-11-11',encodeLoan({kind:'loan',lender:'New',note:'',received:true,source:'bank'}))];
assert.equal(paymentSource(entries[0]),'bank');assert.equal(paymentSource(entries[1]),'cash');assert.equal(moneyDetails(encodeMoney(' a, "b"\n=c','bank')).note,'a, "b"\n=c');
const balance=walletBalances(entries,'2026-11-11');assert.equal(balance.bank,19800);assert.equal(balance.cash,4950);assert.equal(balance.available,24750);
assert.equal(walletBalances([entry('a',.1,salary,'2026-11-11'),entry('b',.2,salary,'2026-11-11')],'2026-11-11').cash,.3);
assert.throws(()=>encodeMoney('"'.repeat(499),'bank'));
const week=periodRange('weekly','2026-11-11');assert.equal(week.start,'2026-11-09');assert.equal(week.end,'2026-11-15');
assert.equal(periodRange('weekly','2027-01-01').start,'2026-12-28');assert.equal(periodRange('monthly','2028-02-12').end,'2028-02-29');assert.throws(()=>periodRange('daily','2026-02-30'));assert.throws(()=>periodRange('custom','2026-11-11',{start:'2026-11-12',end:'2026-11-11'}));
const r=makeReport(entries,week,'2026-11-11');assert.equal(r.income,6000);assert.equal(r.expense,1250);assert.equal(r.net,4750);assert.equal(r.count,4);
const daily=makeReport(entries,periodRange('daily','2026-11-11'),'2026-11-11');assert.equal(daily.income,1000);assert.equal(daily.expense,50);
const evil=entry('evil',1,salary,'2026-11-11',encodeMoney('=SUM(1,2) <script>alert(1)</script>','bank'));const ex=makeReport([evil],week,'2026-11-11');assert.ok(reportCSV(ex).includes("'=SUM(1,2)"));assert.ok(!reportHTML(ex).includes('<script>'));assert.ok(reportHTML(ex).includes('&lt;script&gt;'));assert.ok(reportCSV(ex).includes('bank'));
// Historical lending remains separate from bank/cash debt, including tracking-only records.
assert.equal(walletBalances([entry('lent',400,LENT_CATEGORY,'2026-11-11',encodeLoan({kind:'loan',direction:'lent',lender:'Old',note:'',received:false}))],'2026-11-11').cash,0);
console.log('PASS: wallet legacy mapping, cash defaults, source metadata, loan sources, cents, report boundaries/leap year/custom validation, CSV formula neutralization and HTML escaping.');
