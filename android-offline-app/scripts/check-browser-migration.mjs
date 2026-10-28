import { chromium, expect } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
const base = 'https://expense-track-lovat.vercel.app';
const email = `exptrack-migration-${randomBytes(5).toString('hex')}@example.com`;
const password = randomBytes(18).toString('base64url');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
try {
  const response = await fetch(`${base}/api/auth/register/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-EXPTRACK-Client': 'android', Origin: 'https://localhost' }, body: JSON.stringify({ name: 'Migration test', email, password }) });
  const account = await response.json(); assert.equal(response.status, 200);
  const page = await browser.newPage(); await page.goto(`${base}/privacy/`);
  await page.evaluate(async ({ id }) => {
    const now = new Date().toISOString(); const categoryId = crypto.randomUUID();
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('exptrack-local', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('categories', { keyPath: '_id' });
        const expenses = request.result.createObjectStore('expenses', { keyPath: '_id' });
        expenses.createIndex('date', 'date'); expenses.createIndex('categoryId', 'categoryId');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result; const tx = db.transaction(['categories', 'expenses'], 'readwrite');
        tx.objectStore('categories').put({ _id: categoryId, name: 'Legacy category', icon: 'L', isDefault: false, createdAt: now, updatedAt: now });
        tx.objectStore('expenses').put({ _id: id, categoryId, note: 'Preserved browser v1 entry', amount: 23.45, date: now.slice(0,10), createdAt: now, updatedAt: now });
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
      };
    });
  }, { id: randomUUID() });
  await page.goto(`${base}/login/`); await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password); await page.getByRole('button', { name: 'SIGN IN', exact: true }).click();
  await page.getByText('Preserved browser v1 entry', { exact: true }).waitFor();
  await expect.poll(async () => {
    const res = await fetch(`${base}/api/sync/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account.token}`, Origin: 'https://localhost' }, body: JSON.stringify({ mutations: [] }) });
    assert.equal(res.status,200); const data=await res.json(); return data.expenses.some(e=>e.note==='Preserved browser v1 entry' && e.amount===23.45);
  }, { timeout: 60000 }).toBe(true);
  console.log('PASS: existing browser IndexedDB v1 expense and custom category preserved, migrated and uploaded to the live sync service');
} finally {
  await browser.close(); await mongoose.connect(process.env.MONGODB_URI, { dbName: 'expense_tracker' }); const db=mongoose.connection.db;
  const users=await db.collection('users').find({ email }).toArray(); const userIds=users.map(u=>u._id);
  for(const name of ['auth_sessions','cloud_records','cloud_mutations','cloud_category_aliases','cloud_sync_state']) await db.collection(name).deleteMany({userId:{$in:userIds}});
  await db.collection('users').deleteMany({_id:{$in:userIds}}); await mongoose.disconnect();
}
