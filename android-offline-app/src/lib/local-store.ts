import { INCOME_SOURCES, isIncomeCategory } from "@/lib/income";
import { encodeLoan, loanDetails, loanSummaries, LOAN_CATEGORY, REPAYMENT_CATEGORY } from "@/lib/loan-ledger";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { openDB, type DBSchema } from "idb";
import type { CategoryType, ExpenseItem } from "@/components/ExpenseModal";
import { syncPriority, type SyncMutation, type SyncResponse } from "@/lib/sync-types";

type Category = CategoryType & { createdAt: string; updatedAt: string };
type Expense = Omit<ExpenseItem, "categoryId" | "note"> & { categoryId: string; note: string; createdAt: string; updatedAt: string };
type Store = "categories" | "expenses";
type RecordType = Category | Expense;
interface LocalSchema extends DBSchema {
  categories: { key: string; value: Category };
  expenses: { key: string; value: Expense; indexes: { date: string; categoryId: string } };
  outbox: { key: string; value: SyncMutation & { key: string } };
  aliases: { key: string; value: { id: string; canonicalId: string } };
}
interface NativeStore {
  readSession(): Promise<{ value?: string }>;
  writeSession(options: { value?: string }): Promise<void>;
  setUser(options: { id: string }): Promise<void>;
  list(options: { store: Store; month?: string }): Promise<{ records: RecordType[] }>;
  put(options: { store: Store; record: RecordType }): Promise<void>;
  remove(options: { store: Store; id: string }): Promise<void>;
  syncPending(options: { accountId: string }): Promise<{ mutations: SyncMutation[] }>;
  syncApply(options: { accountId: string; response: SyncResponse }): Promise<void>;
}
export const nativeStore = registerPlugin<NativeStore>("ExpenseStore");
const native = nativeStore;
const isNative = () => Capacitor.isNativePlatform();
let browserDB: ReturnType<typeof openDB<LocalSchema>> | undefined;
let browserName = "exptrack-local";
let activeAccount = "";
export const currentStoreAccount = () => activeAccount;
const changed = () => window.dispatchEvent(new Event("exptrack:local-change"));
const changeRecord = (store: Store, id: string, record?: RecordType): SyncMutation & { key: string } => ({ key: `${store}:${id}`, store, id, mutationId: crypto.randomUUID(), ...(record ? { record } : { deleted: true }) });
export async function selectAccount(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("Invalid account");
  activeAccount = id;
  if (isNative()) await native.setUser({ id });
  else {
    const owner = localStorage.getItem("exptrack-legacy-owner") ?? id;
    localStorage.setItem("exptrack-legacy-owner", owner);
    if (browserDB) (await browserDB).close();
    browserDB = undefined;
    browserName = owner === id ? "exptrack-local" : `exptrack-${id}`;
  }
  ready = undefined;
  await initializeStore();
}
function db() {
  return browserDB ??= openDB<LocalSchema>(browserName, 2, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      if (oldVersion === 0) {
      database.createObjectStore("categories", { keyPath: "_id" });
      const expenses = database.createObjectStore("expenses", { keyPath: "_id" });
      expenses.createIndex("date", "date");
      expenses.createIndex("categoryId", "categoryId");
      }
      if (oldVersion < 2) {
        const outbox = database.createObjectStore("outbox", { keyPath: "key" });
        database.createObjectStore("aliases", { keyPath: "id" });
        if (oldVersion > 0) for (const store of ["categories", "expenses"] as const) {
          void transaction.objectStore(store).getAll().then(records => {
            for (const record of records) void outbox.put(changeRecord(store, record._id, record));
          });
        }
      }
    },
  });
}
async function list(store: Store, month?: string): Promise<RecordType[]> {
  if (isNative()) return (await native.list({ store, month })).records;
  const database = await db();
  if (store === "expenses" && month) return database.getAllFromIndex("expenses", "date", IDBKeyRange.bound(`${month}-01`, `${month}-31`));
  return database.getAll(store);
}
async function put(store: Store, record: RecordType) {
  if (isNative()) { await native.put({ store, record }); changed(); return; }
  const database = await db();
  if (store === "categories") {
    const tx = database.transaction(["categories", "outbox"], "readwrite");
    await tx.objectStore("categories").put(record as Category);
    await tx.objectStore("outbox").put(changeRecord(store, record._id, record));
    await tx.done;
  }
  else {
    const expense = record as Expense;
    const tx = database.transaction(["expenses", "categories", "outbox", "aliases"], "readwrite");
    for (let i = 0; i < 10; i++) {
      const alias = await tx.objectStore("aliases").get(expense.categoryId);
      if (!alias) break;
      expense.categoryId = alias.canonicalId;
    }
    if (!await tx.objectStore("categories").get(expense.categoryId)) {
      tx.abort();
      await tx.done.catch(() => undefined);
      throw new Error("This category no longer exists. Choose another category.");
    }
    const previous = await tx.objectStore("expenses").get(expense._id);
    const saved = { ...expense, createdAt: previous?.createdAt ?? expense.createdAt };
    await tx.objectStore("expenses").put(saved);
    await tx.objectStore("outbox").put(changeRecord(store, saved._id, saved));
    await tx.done;
  }
  changed();
}
async function remove(store: Store, id: string) {
  if (isNative()) { await native.remove({ store, id }); changed(); return; }
  const database = await db();
  const tx = database.transaction(["categories", "expenses", "outbox"], "readwrite");
  if (store === "categories") {
    const category = await tx.objectStore("categories").get(id);
    const used = await tx.objectStore("expenses").index("categoryId").count(id);
    if (category?.isDefault || used) {
      tx.abort();
      await tx.done.catch(() => undefined);
      throw new Error(category?.isDefault ? "Default categories cannot be deleted." : "This category has expenses. Reassign or remove them first.");
    }
  }
  await tx.objectStore(store).delete(id);
  await tx.objectStore("outbox").put(changeRecord(store, id));
  await tx.done;
  changed();
}
export async function pendingSync(accountId: string): Promise<SyncMutation[]> {
  if (activeAccount !== accountId) throw new Error("Account changed");
  const changes = isNative() ? (await native.syncPending({ accountId })).mutations : await (await db()).getAll("outbox");
  return changes.sort((a, b) => syncPriority(a) - syncPriority(b));
}
export async function applyCloudSync(accountId: string, response: SyncResponse) {
  if (activeAccount !== accountId) throw new Error("Account changed");
  if (isNative()) { await native.syncApply({ accountId, response }); return; }
  const database = await db();
  if (activeAccount !== accountId) throw new Error("Account changed");
  const tx = database.transaction(["categories", "expenses", "outbox", "aliases"], "readwrite");
  try {
    const outbox = tx.objectStore("outbox");
    const acknowledged = new Set(response.acknowledged);
    for (const pending of await outbox.getAll()) if (acknowledged.has(pending.mutationId)) await outbox.delete(pending.key);
    async function alias(oldId: string, newId: string) {
      if (oldId === newId) return;
      await tx.objectStore("aliases").put({ id: oldId, canonicalId: newId });
      const old = await tx.objectStore("categories").get(oldId);
      if (old && !await tx.objectStore("categories").get(newId)) await tx.objectStore("categories").put({ ...old, _id: newId });
      for (const expense of await tx.objectStore("expenses").index("categoryId").getAll(oldId)) await tx.objectStore("expenses").put({ ...expense, categoryId: newId });
      await tx.objectStore("categories").delete(oldId);
      for (const pending of await outbox.getAll()) {
        if (pending.store === "categories" && pending.id === oldId) {
          await outbox.delete(pending.key);
          await outbox.put({ ...pending, id: newId, key: `categories:${newId}`, ...(pending.record ? { record: { ...pending.record, _id: newId } } : {}) });
        } else if (pending.store === "expenses" && pending.record && "categoryId" in pending.record && pending.record.categoryId === oldId) {
          await outbox.put({ ...pending, record: { ...pending.record, categoryId: newId } });
        }
      }
    }
    for (const mapping of response.aliases) await alias(mapping.id, mapping.canonicalId);
    for (const category of response.categories) {
      const duplicate = (await tx.objectStore("categories").getAll()).find(item => item.name.toLowerCase() === category.name.toLowerCase() && item._id !== category._id);
      if (duplicate) await alias(duplicate._id, category._id);
      if (!await outbox.get(`categories:${category._id}`)) await tx.objectStore("categories").put(category);
    }
    for (const expense of response.expenses) {
      if (!await outbox.get(`expenses:${expense._id}`)) await tx.objectStore("expenses").put(expense);
    }
    for (const store of ["expenses", "categories"] as const) for (const item of response.deleted.filter(value => value.store === store)) {
      if (await outbox.get(`${store}:${item.id}`)) continue;
      if (store === "categories" && (item.id.startsWith("default-") || await tx.objectStore("expenses").index("categoryId").count(item.id))) continue;
      await tx.objectStore(store).delete(item.id);
    }
    await tx.done;
  } catch (error) { tx.abort(); await tx.done.catch(() => undefined); throw error; }
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not save on this device. Please try again.";
}
let ready: Promise<void> | undefined;
export function initializeStore(): Promise<void> {
  return ready ??= (async () => {
    const existing = await list("categories") as Category[];
    const now = new Date().toISOString();
    const defaults = [
      { _id: "default-bus", name: "Bus", icon: "🚌" },
      { _id: "default-rickshaw", name: "Rickshaw", icon: "🛺" },
      { _id: "default-metro", name: "Metro", icon: "🚇" },
      { _id: "default-food", name: "Food", icon: "🍱" },
    ];
    for (const category of defaults) {
      if (!existing.some(c => c._id === category._id)) await put("categories", { ...category, isDefault: true, createdAt: now, updatedAt: now });
    }
    for (const [id, name, icon] of INCOME_SOURCES) {
      if (!existing.some(c => c._id === id)) await put('categories', { _id: id, name: 'Income: ' + name, icon, isDefault: false, createdAt: now, updatedAt: now });
    }
    if (!isNative()) void navigator.storage?.persist?.().catch(() => false);
  })().catch(error => { ready = undefined; throw error; });
}
async function allCategories(): Promise<Category[]> {
  await initializeStore();
  return (await list("categories") as Category[]).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name));
}
export async function getTransactions(month?: string, includeExistingDebt = false): Promise<ExpenseItem[]> {
  await initializeStore();
  const [expenses, categories] = await Promise.all([list("expenses", month) as Promise<Expense[]>, allCategories()]);
  const byId = new Map(categories.map(c => [c._id, c]));
  return expenses.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map(e => ({ ...e, categoryId: byId.get(e.categoryId) ?? e.categoryId }))
    .filter(e => includeExistingDebt || loanDetails(e)?.received !== false);
}
async function saveLedgerEntry(input: { amount: number; categoryId: string; note: string; date: string }, id?: string) {
  await initializeStore();
  const cents = Math.round(input.amount * 100);
  if (!Number.isFinite(input.amount) || cents < 1 || cents > 99999999999 || Math.abs(input.amount * 100 - cents) > 0.0001) throw new Error("Enter an amount from 0.01 to 999,999,999.99 with at most two decimal places.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || localDate(new Date(`${input.date}T12:00:00`)) !== input.date) throw new Error("Choose a valid date.");
  if (input.note.length > 500) throw new Error("Keep the note within 500 characters.");
  const now = new Date().toISOString();
  await put("expenses", { ...input, note: input.note.trim(), amount: cents / 100, _id: id ?? crypto.randomUUID(), createdAt: now, updatedAt: now });
}
export async function saveExpense(input: { amount: number; categoryId: string; note: string; date: string }, id?: string) {
  if (id && loanDetails((await getTransactions(undefined, true)).find(e => e._id === id) ?? { _id: id, ...input })) throw new Error("Manage this entry on the Loans page.");
  if (input.categoryId === REPAYMENT_CATEGORY || input.note.startsWith("EXTRACK-LOAN:1:")) throw new Error("Record loan repayments on the Loans page.");
  await saveLedgerEntry(input, id);
}
export async function addLoan(input: { amount: number; lender: string; note: string; date: string; received: boolean }) {
  const lender = input.lender.trim();
  if (!lender || lender.length > 80) throw new Error("Enter a lender name within 80 characters.");
  if (input.note.length > 150) throw new Error("Keep the note within 150 characters.");
  if (input.date > localDate()) throw new Error("Choose today or an earlier borrowing date.");
  await saveLedgerEntry({ amount: input.amount, categoryId: LOAN_CATEGORY, date: input.date, note: encodeLoan({ kind: "loan", lender, note: input.note.trim(), received: input.received }) });
}
export async function repayLoan(id: string, amount: number, date: string, note: string) {
  const save = async () => {
    const loan = loanSummaries(await getTransactions(undefined, true), localDate()).find(e => e._id === id);
    if (!loan) throw new Error("This loan no longer exists. Refresh and try again.");
    if (!Number.isFinite(amount) || Math.round(amount * 100) < 1 || Math.round(amount * 100) > Math.round(loan.remaining * 100)) throw new Error("Repayment must be greater than zero and no more than the remaining balance.");
    if (date < loan.date || date > localDate()) throw new Error("Choose a repayment date between borrowing and today.");
    if (note.length > 150) throw new Error("Keep the note within 150 characters.");
    const categories = await allCategories();
    const repaymentCategory = categories.find(c => c._id === REPAYMENT_CATEGORY || c.name.toLowerCase() === "loan repayment");
    if (!repaymentCategory) {
      const now = new Date().toISOString();
      // Existing categories with this name are resolved by the normal cloud alias mechanism.
      await put("categories", { _id: REPAYMENT_CATEGORY, name: "Loan repayment", icon: "🏦", isDefault: false, createdAt: now, updatedAt: now });
    }
    await saveLedgerEntry({ amount, date, categoryId: repaymentCategory?._id ?? REPAYMENT_CATEGORY, note: encodeLoan({ kind: "payment", lender: loan.details.lender.slice(0,80), loanId: id, note: note.trim() }) });
  };
  if (!isNative() && navigator.locks) await navigator.locks.request(`exptrack-loan-${activeAccount}-${id}`, save);
  else await save();
}
export async function addCategory(name: string, icon: string) {
  const categories = await getCategories();
  name = name.trim();
  if (name.startsWith("Income: ")) throw new Error("This name is reserved for income sources.");
  if (!name || name.length > 40) throw new Error("Use a category name between 1 and 40 characters.");
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) throw new Error("A category with this name already exists.");
  if (icon.length > 16) throw new Error("Choose a single emoji for the category.");
  const now = new Date().toISOString();
  await put("categories", { _id: crypto.randomUUID(), name, icon: icon || "🏷️", isDefault: false, createdAt: now, updatedAt: now });
}
export const deleteExpense = async (id: string) => {
  const entry = (await getTransactions(undefined, true)).find(e => e._id === id);
  if (entry && loanDetails(entry)) throw new Error("Loan records are kept with their repayment history.");
  return remove("expenses", id);
};
export const deleteCategory = (id: string) => { if (isIncomeCategory(id)) throw new Error("Income sources cannot be deleted."); return remove("categories", id); };

export async function getCategories() { return (await allCategories()).filter(c => !isIncomeCategory(c._id) && c._id !== REPAYMENT_CATEGORY && c.name.toLowerCase() !== "loan repayment"); }
export async function getIncomeCategories() { return (await allCategories()).filter(c => isIncomeCategory(c._id)).sort((a,b) => INCOME_SOURCES.findIndex(([id]) => id === a._id) - INCOME_SOURCES.findIndex(([id]) => id === b._id)).map(c => ({ ...c, name: c.name.replace(/^Income: /, '') })); }
export async function getExpenses(month: string) { return (await getTransactions(month)).filter(e => !isIncomeCategory(e.categoryId)); }
export async function getBalance() {
  const entries = (await getTransactions()).filter(e => e.date <= localDate());
  const received = entries.filter(e => isIncomeCategory(e.categoryId)).reduce((sum,e) => sum + Math.round(e.amount*100),0);
  const spent = entries.filter(e => !isIncomeCategory(e.categoryId)).reduce((sum,e) => sum + Math.round(e.amount*100),0);
  return { received: received/100, spent: spent/100, available: (received-spent)/100 };
}
