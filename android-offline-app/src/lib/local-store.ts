import { Capacitor, registerPlugin } from "@capacitor/core";
import { openDB, type DBSchema } from "idb";
import type { CategoryType, ExpenseItem } from "@/components/ExpenseModal";

type Category = CategoryType & { createdAt: string; updatedAt: string };
type Expense = Omit<ExpenseItem, "categoryId"> & { categoryId: string; createdAt: string; updatedAt: string };
type Store = "categories" | "expenses";
type RecordType = Category | Expense;
interface LocalSchema extends DBSchema {
  categories: { key: string; value: Category };
  expenses: { key: string; value: Expense; indexes: { date: string; categoryId: string } };
}
interface NativeStore {
  readSession(): Promise<{ value?: string }>;
  writeSession(options: { value?: string }): Promise<void>;
  setUser(options: { id: string }): Promise<void>;
  list(options: { store: Store; month?: string }): Promise<{ records: RecordType[] }>;
  put(options: { store: Store; record: RecordType }): Promise<void>;
  remove(options: { store: Store; id: string }): Promise<void>;
}
export const nativeStore = registerPlugin<NativeStore>("ExpenseStore");
const native = nativeStore;
const isNative = () => Capacitor.isNativePlatform();
let browserDB: ReturnType<typeof openDB<LocalSchema>> | undefined;
let browserName = "exptrack-local";
export async function selectAccount(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("Invalid account");
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
  return browserDB ??= openDB<LocalSchema>(browserName, 1, {
    upgrade(database) {
      database.createObjectStore("categories", { keyPath: "_id" });
      const expenses = database.createObjectStore("expenses", { keyPath: "_id" });
      expenses.createIndex("date", "date");
      expenses.createIndex("categoryId", "categoryId");
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
  if (isNative()) return native.put({ store, record });
  const database = await db();
  if (store === "categories") await database.put("categories", record as Category);
  else {
    const expense = record as Expense;
    const tx = database.transaction(["expenses", "categories"], "readwrite");
    if (!await tx.objectStore("categories").get(expense.categoryId)) {
      tx.abort();
      await tx.done.catch(() => undefined);
      throw new Error("This category no longer exists. Choose another category.");
    }
    const previous = await tx.objectStore("expenses").get(expense._id);
    await tx.objectStore("expenses").put({ ...expense, createdAt: previous?.createdAt ?? expense.createdAt });
    await tx.done;
  }
}
async function remove(store: Store, id: string) {
  if (isNative()) return native.remove({ store, id });
  const database = await db();
  const tx = database.transaction(["categories", "expenses"], "readwrite");
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
  await tx.done;
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
    if (!isNative()) void navigator.storage?.persist?.().catch(() => false);
  })().catch(error => { ready = undefined; throw error; });
}
export async function getCategories(): Promise<Category[]> {
  await initializeStore();
  return (await list("categories") as Category[]).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name));
}
export async function getExpenses(month: string): Promise<ExpenseItem[]> {
  await initializeStore();
  const [expenses, categories] = await Promise.all([list("expenses", month) as Promise<Expense[]>, getCategories()]);
  const byId = new Map(categories.map(c => [c._id, c]));
  return expenses.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map(e => ({ ...e, categoryId: byId.get(e.categoryId) ?? e.categoryId }));
}
export async function saveExpense(input: { amount: number; categoryId: string; note: string; date: string }, id?: string) {
  await initializeStore();
  const cents = Math.round(input.amount * 100);
  if (!Number.isFinite(input.amount) || cents < 1 || cents > 99999999999 || Math.abs(input.amount * 100 - cents) > 0.0001) throw new Error("Enter an amount from 0.01 to 999,999,999.99 with at most two decimal places.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || localDate(new Date(`${input.date}T12:00:00`)) !== input.date) throw new Error("Choose a valid date.");
  if (input.note.length > 500) throw new Error("Keep the note within 500 characters.");
  const now = new Date().toISOString();
  await put("expenses", { ...input, note: input.note.trim(), amount: cents / 100, _id: id ?? crypto.randomUUID(), createdAt: now, updatedAt: now });
}
export async function addCategory(name: string, icon: string) {
  const categories = await getCategories();
  name = name.trim();
  if (!name || name.length > 40) throw new Error("Use a category name between 1 and 40 characters.");
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) throw new Error("A category with this name already exists.");
  if (icon.length > 16) throw new Error("Choose a single emoji for the category.");
  const now = new Date().toISOString();
  await put("categories", { _id: crypto.randomUUID(), name, icon: icon || "🏷️", isDefault: false, createdAt: now, updatedAt: now });
}
export const deleteExpense = (id: string) => remove("expenses", id);
export const deleteCategory = (id: string) => remove("categories", id);
