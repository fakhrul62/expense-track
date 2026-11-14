// Real API/DB integration; generated accounts only, with exact cleanup even on failure.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import mongoose from 'mongoose';
const base=process.env.ACCOUNT_TEST_URL??'http://localhost:3005';
const emails=[0,1].map(i=>`exptrack-qc-fix-${randomBytes(8).toString('hex')}-${i}@example.com`);
const password=randomBytes(18).toString('base64url'),now=new Date().toISOString(),date=now.slice(0,10),accounts=[];
const salary='10000000-0000-4000-8000-000000000001',borrow='10000000-0000-4000-8000-000000000002',collect='10000000-0000-4000-8000-000000000003',repay='20000000-0000-4000-8000-000000000001',lent='20000000-0000-4000-8000-000000000002';
const cat=(_id,name)=>({_id,name,icon:'🤝',isDefault:false,createdAt:now,updatedAt:now});
const exp=(_id,categoryId,amount,details)=>({_id,categoryId,amount,note:'EXTRACK-LOAN:1:'+JSON.stringify(details),date,createdAt:now,updatedAt:now});
const change=(store,record)=>({store,id:record._id,record,mutationId:randomUUID()});
const del=id=>({store:'expenses',id,deleted:true,mutationId:randomUUID()});
async function api(path,body,token,status=200){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://localhost','X-EXPTRACK-Client':'android',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
const sync=(mutations,who=accounts[0],status=200)=>api('/api/sync/',{mutations},who.token,status);
try{
 for(const email of emails)accounts.push(await api('/api/auth/register/',{email,password,name:'QC fix account'}));
 await mongoose.connect(process.env.MONGODB_URI,{dbName:'expense_tracker'});const db=mongoose.connection.db;
 for(const name of ['income: salary','INCOME: Salary',' Income : Salary ','Income:Salary'])await sync([change('categories',cat(randomUUID(),name))],accounts[0],400);
 const spending=randomUUID();await sync([change('categories',cat(salary,'Income: Salary')),change('categories',cat(spending,'QC spending')),change('categories',cat(borrow,'Income: Loan received')),change('categories',cat(repay,'Loan repayment')),change('categories',cat(lent,'Money lent')),change('categories',cat(collect,'Income: Owed money repaid'))]);
 // An old unsafe alias must not change direction or overwrite the canonical salary.
 const uid=new mongoose.Types.ObjectId(accounts[0].user.id);
 await db.collection('cloud_category_aliases').insertOne({userId:uid,aliasId:spending,canonicalId:salary});
 const purchase={_id:randomUUID(),categoryId:spending,amount:100,note:'ordinary spending',date,createdAt:now,updatedAt:now};
 let result=await sync([change('expenses',purchase)]);assert.equal(result.expenses.find(e=>e._id===purchase._id).categoryId,spending);assert(!result.aliases.some(a=>a.id===spending));assert.equal(result.categories.find(c=>c._id===salary).name,'Income: Salary');await sync([del(purchase._id)]);
 console.log('PASS: mixed-case reserved names rejected; unsafe legacy alias cannot flip spending or overwrite income');
 for(const direction of ['borrowed','lent'])for(const paymentFirst of [false,true]){
  const id=randomUUID(),pid=randomUUID(),categoryId=direction==='lent'?lent:borrow,paymentCat=direction==='lent'?collect:repay;
  const loan=exp(id,categoryId,1000,{kind:'loan',direction,lender:'QC lender',note:'',source:'bank',received:true});
  const payment=exp(pid,paymentCat,100,{kind:'payment',direction,lender:'QC lender',note:'late repayment',source:'bank',loanId:id});
  await sync([change('expenses',loan)]);
  // Simulate device A knowing only the principal; device B's payment can arrive in either order.
  if(paymentFirst)await sync([change('expenses',payment)]);
  const deletion=del(id);result=await sync([deletion]);
  const upload=change('expenses',payment);if(!paymentFirst)result=await sync([upload]);
  let kept=result.expenses.find(e=>e._id===pid);assert(kept);assert.equal(kept.amount,100);assert(!kept.note.startsWith('EXTRACK-LOAN:'));assert.equal(JSON.parse(kept.note.slice('EXTRACK-MONEY:1:'.length)).source,'bank');assert.equal(kept.categoryId===collect,direction==='lent');assert(result.warnings.length||paymentFirst);
  const repeat=await sync([paymentFirst?deletion:upload]);assert.equal(repeat.expenses.filter(e=>e._id===pid).length,1);
  // A stale/new upload of the same offline payment is still recoverable and does not duplicate it.
  result=await sync([change('expenses',payment)]);assert.equal(result.expenses.filter(e=>e._id===pid).length,1);assert(!result.expenses.find(e=>e._id===pid).note.startsWith('EXTRACK-LOAN:'));
  assert(!(await sync([],accounts[1])).expenses.some(e=>e._id===pid));
  await sync([del(pid)]);assert(!(await sync([])).expenses.some(e=>e._id===pid));
 }
 // Same-batch payment before its principal is valid once the full batch is applied.
 const lid=randomUUID(),pid=randomUUID(),loan=exp(lid,borrow,500,{kind:'loan',lender:'Batch',note:''}),payment=exp(pid,repay,50,{kind:'payment',lender:'Batch',note:'',loanId:lid});
 result=await sync([change('expenses',payment),change('expenses',loan)]);assert(result.expenses.find(e=>e._id===pid).note.startsWith('EXTRACK-LOAN:'));
 await sync([del(lid),del(pid)]);assert(!(await sync([])).expenses.some(e=>[lid,pid].includes(e._id)));
 // Reconcile an already-existing orphan on an empty pull as well.
 const legacy=exp(randomUUID(),repay,12,{kind:'payment',lender:'Legacy',note:'preserve me',loanId:randomUUID()});
 await db.collection('cloud_records').insertOne({userId:uid,store:'expenses',recordId:legacy._id,record:legacy,deleted:false});
 result=await sync([]);assert(result.expenses.find(e=>e._id===legacy._id).note.includes('preserve me'));assert(!result.expenses.find(e=>e._id===legacy._id).note.startsWith('EXTRACK-LOAN:'));
 console.log('PASS: borrowed/lent late payments, both upload orders, retries, account isolation, recovery deletion, same-batch ordering and legacy orphan repair');
}finally{
 if(mongoose.connection.readyState!==1)await mongoose.connect(process.env.MONGODB_URI,{dbName:'expense_tracker'});
 const db=mongoose.connection.db,users=await db.collection('users').find({email:{$in:emails}}).toArray(),ids=users.map(u=>u._id);
 for(const name of ['auth_sessions','cloud_records','cloud_mutations','cloud_category_aliases','cloud_sync_state'])await db.collection(name).deleteMany({userId:{$in:ids}});
 await db.collection('users').deleteMany({_id:{$in:ids}});await mongoose.disconnect();
}
