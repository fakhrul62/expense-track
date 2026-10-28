import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { accountCors, accountReply, authenticatedAccount } from "@/lib/account-server";
import { syncPriority, type CloudCategory, type CloudExpense, type SyncMutation, type SyncResponse } from "@/lib/sync-types";

const validId = (value: unknown): value is string => typeof value === "string" && /^(?:[a-f0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|default-(bus|rickshaw|metro|food))$/.test(value);
const timestamp = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
function mutation(value: unknown): SyncMutation {
  if (!value || typeof value !== "object") throw new Error("Invalid change");
  const item = value as Record<string, unknown>;
  if (!["categories", "expenses"].includes(String(item.store)) || !validId(item.id) || typeof item.mutationId !== "string" || !/^[a-f0-9-]{36}$/.test(item.mutationId)) throw new Error("Invalid change");
  const result: SyncMutation = { store: item.store as SyncMutation["store"], id: item.id, mutationId: item.mutationId };
  if (item.deleted === true) return { ...result, deleted: true };
  if (!item.record || typeof item.record !== "object") throw new Error("Missing record");
  const record = item.record as Record<string, unknown>;
  if (record._id !== item.id || !timestamp(record.createdAt) || !timestamp(record.updatedAt)) throw new Error("Invalid record");
  const common = { _id: item.id, createdAt: record.createdAt, updatedAt: record.updatedAt };
  if (item.store === "categories") {
    if (typeof record.name !== "string" || !record.name.trim() || record.name.trim().length > 40 || typeof record.icon !== "string" || record.icon.length > 16 || typeof record.isDefault !== "boolean" || record.isDefault !== item.id.startsWith("default-")) throw new Error("Invalid category");
    const defaults: Record<string, string> = { "default-bus": "Bus", "default-rickshaw": "Rickshaw", "default-metro": "Metro", "default-food": "Food" };
    if (record.isDefault && record.name !== defaults[item.id]) throw new Error("Invalid default category");
    result.record = { ...common, name: record.name.trim(), icon: record.icon, isDefault: record.isDefault };
  } else {
    if (typeof record.amount !== "number" || !Number.isFinite(record.amount) || record.amount < 0.01 || record.amount > 999999999.99 || Math.abs(record.amount * 100 - Math.round(record.amount * 100)) > 0.0001 || !validId(record.categoryId) || typeof record.note !== "string" || record.note.length > 500 || typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) || !Number.isFinite(Date.parse(`${record.date}T12:00:00Z`)) || new Date(`${record.date}T12:00:00Z`).toISOString().slice(0, 10) !== record.date) throw new Error("Invalid expense");
    result.record = { ...common, amount: Math.round(record.amount * 100) / 100, categoryId: record.categoryId, note: record.note, date: record.date };
  }
  return result;
}
let indexes: Promise<unknown> | undefined;
export async function syncHandler(req: NextRequest) {
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: accountCors(req) });
  if (req.headers.get("origin") && !Object.keys(accountCors(req)).length) return accountReply(req, { error: "Origin not allowed" }, 403);
  if (req.method !== "POST") return accountReply(req, { error: "Method not allowed" }, 405);
  try {
    const auth = await authenticatedAccount(req);
    if (!auth) return accountReply(req, { error: "Please sign in again to sync." }, 401);
    if (Number(req.headers.get("content-length") ?? 0) > 256000) return accountReply(req, { error: "Sync request too large" }, 413);
    const raw = await req.text();
    if (raw.length > 256000) return accountReply(req, { error: "Sync request too large" }, 413);
    let changes: SyncMutation[];
    try {
      const input = JSON.parse(raw);
      if (!Array.isArray(input.mutations) || input.mutations.length > 100) throw new Error();
      changes = input.mutations.map(mutation).sort((a: SyncMutation, b: SyncMutation) => syncPriority(a) - syncPriority(b));
    } catch { return accountReply(req, { error: "Invalid sync request" }, 400); }
    const { db, userId } = auth;
    const records = db.collection("cloud_records");
    const applied = db.collection("cloud_mutations");
    const aliases = db.collection("cloud_category_aliases");
    const states = db.collection("cloud_sync_state");
    indexes ??= Promise.all([
      records.createIndex({ userId: 1, store: 1, recordId: 1 }, { unique: true }),
      records.createIndex({ userId: 1, categoryName: 1 }, { unique: true, partialFilterExpression: { store: "categories", deleted: false } }),
      applied.createIndex({ userId: 1, mutationId: 1 }, { unique: true }),
      aliases.createIndex({ userId: 1, aliasId: 1 }, { unique: true }),
      states.createIndex({ userId: 1 }, { unique: true }),
    ]).catch(error => { indexes = undefined; throw error; });
    await indexes;
    try { await states.updateOne({ userId }, { $setOnInsert: { revision: 0 } }, { upsert: true }); }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error; }
    const transaction = await mongoose.connection.startSession();
    let response!: SyncResponse;
    try {
      await transaction.withTransaction(async () => {
        const options = { session: transaction };
        // Serialize writes for an account to prevent category-delete/expense-create write skew.
        if (changes.length) await states.updateOne({ userId }, { $inc: { revision: 1 } }, options);
        const warnings = new Set<string>();
        const resolveCategory = async (id: string) => {
          for (let count = 0; count < 10; count++) {
            const alias = await aliases.findOne({ userId, aliasId: id }, options);
            if (!alias) return id;
            id = alias.canonicalId;
          }
          throw new Error("Invalid category mapping");
        };
        for (const change of changes) {
          if (await applied.findOne({ userId, mutationId: change.mutationId }, options)) continue;
          let id = change.store === "categories" ? await resolveCategory(change.id) : change.id;
          let record = change.record;
          if (!change.deleted && change.store === "categories") {
            const category = record as CloudCategory;
            const existing = await records.findOne({ userId, store: "categories", deleted: false, categoryName: category.name.toLowerCase() }, options);
            if (existing && existing.recordId !== id) {
              await aliases.updateOne({ userId, aliasId: id }, { $set: { canonicalId: existing.recordId } }, { ...options, upsert: true });
              id = existing.recordId;
            }
            record = { ...category, _id: id };
          }
          if (!change.deleted && change.store === "expenses") {
            const expense = record as CloudExpense;
            let categoryId = await resolveCategory(expense.categoryId);
            const parent = await records.findOne({ userId, store: "categories", recordId: categoryId }, options);
            if (!parent?.record) throw new Error("The expense category has not synced yet");
            if (parent.deleted) {
              const replacement = await records.findOne({ userId, store: "categories", deleted: false, categoryName: parent.categoryName }, options);
              if (replacement) {
                await aliases.updateOne({ userId, aliasId: categoryId }, { $set: { canonicalId: replacement.recordId } }, { ...options, upsert: true });
                categoryId = replacement.recordId;
              } else await records.updateOne({ _id: parent._id }, { $set: { deleted: false } }, options);
              warnings.add("A category was restored to keep an offline expense.");
            }
            record = { ...expense, categoryId };
          }
          let keepCategory = false;
          if (change.deleted && change.store === "categories") {
            keepCategory = id.startsWith("default-") || Boolean(await records.findOne({ userId, store: "expenses", deleted: false, "record.categoryId": id }, options));
            if (keepCategory) warnings.add("A category was kept because it contains synced expenses.");
          }
          if (!keepCategory) {
            const previous = record && await records.findOne({ userId, store: change.store, recordId: id }, options);
            if (record && previous?.record) record = { ...record, createdAt: previous.record.createdAt };
            await records.updateOne({ userId, store: change.store, recordId: id }, { $set: { deleted: Boolean(change.deleted), ...(record ? { record } : {}), ...(record && change.store === "categories" ? { categoryName: (record as CloudCategory).name.toLowerCase() } : {}) } }, { ...options, upsert: true });
          }
          await applied.insertOne({ userId, mutationId: change.mutationId, createdAt: new Date() }, options);
        }
        const all = await records.find({ userId }, options).toArray();
        const categoryAliases = await aliases.find({ userId }, options).toArray();
        response = {
          acknowledged: changes.map(change => change.mutationId),
          categories: all.filter(item => item.store === "categories" && !item.deleted).map(item => item.record as CloudCategory),
          expenses: all.filter(item => item.store === "expenses" && !item.deleted).map(item => item.record as CloudExpense),
          deleted: all.filter(item => item.deleted).map(item => ({ store: item.store, id: item.recordId })),
          aliases: categoryAliases.map(item => ({ id: item.aliasId, canonicalId: item.canonicalId })),
          warnings: [...warnings],
        };
      });
    } finally { await transaction.endSession(); }
    return accountReply(req, response);
  } catch { return accountReply(req, { error: "Could not sync right now. Your entries remain saved on this device." }, 503); }
}
