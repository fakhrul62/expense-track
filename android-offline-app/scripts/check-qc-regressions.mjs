import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const exports={};cache.set(path,exports);vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>load(n.replace('@/','src/')+'.ts')});return exports;}
const {reservedIncomeName}=load('src/lib/income.ts');
const {encodeMoney,moneyNoteCapacity}=load('src/lib/wallet.ts');
const {loanSummaries,encodeLoan,LOAN_CATEGORY,REPAYMENT_CATEGORY,LENT_CATEGORY,COLLECTION_CATEGORY}=load('src/lib/loan-ledger.ts');
const {makeReport,reportCSV}=load('src/lib/reports.ts');
for(const name of ['income: salary','INCOME: Salary',' Income : Salary ','Income:Salary'])assert(reservedIncomeName(name));
assert(!reservedIncomeName('Salary spending'));
for(const source of ['bank','cash'])for(const note of ['a'.repeat(500),'"'.repeat(250),'\\'.repeat(250),'hello','  trimmed  ']){
  assert.equal(moneyNoteCapacity(note,source)<0,(()=>{try{encodeMoney(note,source);return false;}catch{return true;}})());
}
const entry=(_id,categoryId,amount,note,date='2026-11-14')=>({_id,categoryId,amount,note,date});
for(const prefix of ['', '\t','\r','\n',' \t','\u0000','\ufeff'])for(const formula of ['=1+1','+cmd','-cmd','@SUM(A1)']){
  const csv=reportCSV(makeReport([entry('test','default-bus',1,prefix+formula)],'2026-11','2026-11-14'));
  assert(csv.includes('"\''+prefix+formula+'"'));
}
const rows=[
 entry('borrow',LOAN_CATEGORY,1000,encodeLoan({kind:'loan',lender:'A',note:''})),
 entry('lend',LENT_CATEGORY,500,encodeLoan({kind:'loan',direction:'lent',lender:'B',note:''})),
 entry('partial',REPAYMENT_CATEGORY,100,encodeLoan({kind:'payment',loanId:'borrow',lender:'A',note:''})),
 entry('future',REPAYMENT_CATEGORY,200,encodeLoan({kind:'payment',loanId:'borrow',lender:'A',note:''}),'2026-11-15'),
 entry('collection',COLLECTION_CATEGORY,50,encodeLoan({kind:'payment',direction:'lent',loanId:'lend',lender:'B',note:''})),
 entry('wrong-direction',COLLECTION_CATEGORY,30,encodeLoan({kind:'payment',direction:'lent',loanId:'borrow',lender:'B',note:''})),
];
assert(reportCSV(makeReport([entry('negative','default-bus',100,'safe')],'2026-11','2026-11-14')).includes('"Net",-100.00'));
const loans=loanSummaries(rows,'2026-11-14');
assert.equal(loans.find(l=>l._id==='borrow').remaining,900);
assert.equal(loans.find(l=>l._id==='borrow').payments.length,2);
assert.equal(loans.find(l=>l._id==='lend').remaining,450);
assert.equal(loans.find(l=>l._id==='borrow').payments[0]._id,'future');
console.log('PASS: reserved names, serialized note budgets, control-whitespace CSV safety and grouped loan direction/date arithmetic');
