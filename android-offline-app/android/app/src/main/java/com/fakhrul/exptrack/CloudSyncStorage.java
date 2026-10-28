package com.fakhrul.exptrack;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;

/** Sync metadata lives in the same transaction and private account database as each edit. */
final class CloudSyncStorage {
    static void create(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE sync_outbox (key TEXT PRIMARY KEY, mutation_id TEXT NOT NULL, payload TEXT NOT NULL)");
        db.execSQL("CREATE TABLE sync_aliases (id TEXT PRIMARY KEY, canonical_id TEXT NOT NULL)");
    }
    static JSObject record(Cursor cursor, String table) {
        JSObject value = new JSObject();
        value.put("_id", text(cursor, "id")); value.put("createdAt", text(cursor, "created_at")); value.put("updatedAt", text(cursor, "updated_at"));
        if (table.equals("categories")) {
            value.put("name", text(cursor, "name")); value.put("icon", text(cursor, "icon"));
            value.put("isDefault", cursor.getInt(cursor.getColumnIndexOrThrow("is_default")) == 1);
        } else {
            value.put("amount", cursor.getLong(cursor.getColumnIndexOrThrow("amount_cents")) / 100.0);
            value.put("categoryId", text(cursor, "category_id")); value.put("note", text(cursor, "note")); value.put("date", text(cursor, "date"));
        }
        return value;
    }
    private static String text(Cursor cursor, String column) { return cursor.getString(cursor.getColumnIndexOrThrow(column)); }
    static void migrate(SQLiteDatabase db) throws Exception {
        create(db);
        for (String store : new String[]{"categories", "expenses"}) {
            try (Cursor cursor = db.query(store, null, null, null, null, null, null)) {
                while (cursor.moveToNext()) { JSObject value = record(cursor, store); enqueue(db, store, value.getString("_id"), value); }
            }
        }
    }
    static void enqueue(SQLiteDatabase db, String store, String id, JSONObject record) throws Exception {
        JSONObject change = new JSONObject();
        String mutationId = UUID.randomUUID().toString();
        change.put("store", store); change.put("id", id); change.put("mutationId", mutationId);
        if (record == null) change.put("deleted", true); else change.put("record", record);
        saveMutation(db, change);
    }
    private static void saveMutation(SQLiteDatabase db, JSONObject change) throws Exception {
        ContentValues values = new ContentValues();
        values.put("key", change.getString("store") + ":" + change.getString("id"));
        values.put("mutation_id", change.getString("mutationId")); values.put("payload", change.toString());
        db.insertWithOnConflict("sync_outbox", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    }
    static JSArray pending(SQLiteDatabase db) throws Exception {
        JSArray changes = new JSArray();
        try (Cursor cursor = db.query("sync_outbox", new String[]{"payload"}, null, null, null, null, "rowid")) {
            while (cursor.moveToNext()) changes.put(new JSONObject(cursor.getString(0)));
        }
        return changes;
    }
    static String resolve(SQLiteDatabase db, String id) {
        for (int i = 0; i < 10; i++) {
            try (Cursor cursor = db.rawQuery("SELECT canonical_id FROM sync_aliases WHERE id = ?", new String[]{id})) {
                if (!cursor.moveToFirst()) return id;
                id = cursor.getString(0);
            }
        }
        throw new IllegalArgumentException("Invalid category mapping");
    }
    static void write(SQLiteDatabase db, String table, JSONObject record) throws Exception {
        ContentValues values = new ContentValues();
        String id = record.getString("_id");
        values.put("id", id); values.put("updated_at", record.getString("updatedAt"));
        if (table.equals("categories")) {
            values.put("name", record.getString("name")); values.put("icon", record.getString("icon")); values.put("is_default", record.getBoolean("isDefault") ? 1 : 0);
        } else {
            String categoryId = resolve(db, record.getString("categoryId")); record.put("categoryId", categoryId);
            values.put("amount_cents", Math.round(record.getDouble("amount") * 100)); values.put("category_id", categoryId);
            values.put("note", record.optString("note", "")); values.put("date", record.getString("date"));
        }
        if (db.update(table, values, "id = ?", new String[]{id}) == 0) {
            values.put("created_at", record.getString("createdAt")); db.insertOrThrow(table, null, values);
        } else try (Cursor cursor = db.rawQuery("SELECT created_at FROM " + table + " WHERE id = ?", new String[]{id})) { if (cursor.moveToFirst()) record.put("createdAt", cursor.getString(0)); }
    }
    private static boolean hasPending(SQLiteDatabase db, String store, String id) {
        try (Cursor cursor = db.rawQuery("SELECT 1 FROM sync_outbox WHERE key = ?", new String[]{store + ":" + id})) { return cursor.moveToFirst(); }
    }
    private static void alias(SQLiteDatabase db, String oldId, String newId) throws Exception {
        if (oldId.equals(newId)) return;
        ContentValues mapping = new ContentValues(); mapping.put("id", oldId); mapping.put("canonical_id", newId);
        db.insertWithOnConflict("sync_aliases", null, mapping, SQLiteDatabase.CONFLICT_REPLACE);
        boolean exists;
        try (Cursor cursor = db.rawQuery("SELECT 1 FROM categories WHERE id = ?", new String[]{newId})) { exists = cursor.moveToFirst(); }
        // Deferred foreign keys keep the rename and every dependent expense atomic.
        if (!exists) db.execSQL("UPDATE categories SET id = ? WHERE id = ?", new Object[]{newId, oldId});
        db.execSQL("UPDATE expenses SET category_id = ? WHERE category_id = ?", new Object[]{newId, oldId});
        if (exists) db.delete("categories", "id = ?", new String[]{oldId});
        JSArray changes = pending(db);
        for (int i = 0; i < changes.length(); i++) {
            JSONObject change = changes.getJSONObject(i);
            JSONObject record = change.optJSONObject("record");
            if (change.getString("store").equals("categories") && change.getString("id").equals(oldId)) {
                db.delete("sync_outbox", "key = ?", new String[]{"categories:" + oldId});
                change.put("id", newId); if (record != null) record.put("_id", newId); saveMutation(db, change);
            } else if (record != null && change.getString("store").equals("expenses") && record.getString("categoryId").equals(oldId)) {
                record.put("categoryId", newId); saveMutation(db, change);
            }
        }
    }
    static void apply(SQLiteDatabase db, JSONObject response) throws Exception {
        db.beginTransaction();
        try {
            db.execSQL("PRAGMA defer_foreign_keys = ON");
            JSONArray acknowledged = response.getJSONArray("acknowledged");
            for (int i = 0; i < acknowledged.length(); i++) db.delete("sync_outbox", "mutation_id = ?", new String[]{acknowledged.getString(i)});
            JSONArray mappings = response.getJSONArray("aliases");
            for (int i = 0; i < mappings.length(); i++) {
                JSONObject mapping = mappings.getJSONObject(i); alias(db, mapping.getString("id"), mapping.getString("canonicalId"));
            }
            JSONArray categories = response.getJSONArray("categories");
            for (int i = 0; i < categories.length(); i++) {
                JSONObject category = categories.getJSONObject(i); String id = category.getString("_id");
                String duplicate = null;
                try (Cursor cursor = db.rawQuery("SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND id != ?", new String[]{category.getString("name"), id})) { if (cursor.moveToFirst()) duplicate = cursor.getString(0); }
                if (duplicate != null) alias(db, duplicate, id);
                if (!hasPending(db, "categories", id)) write(db, "categories", category);
            }
            JSONArray expenses = response.getJSONArray("expenses");
            for (int i = 0; i < expenses.length(); i++) {
                JSONObject expense = expenses.getJSONObject(i);
                if (!hasPending(db, "expenses", expense.getString("_id"))) write(db, "expenses", expense);
            }
            JSONArray deleted = response.getJSONArray("deleted");
            for (String store : new String[]{"expenses", "categories"}) {
                for (int i = 0; i < deleted.length(); i++) {
                    JSONObject deletion = deleted.getJSONObject(i); String id = deletion.getString("id");
                    if (!store.equals(deletion.getString("store")) || hasPending(db, store, id)) continue;
                    if (store.equals("categories")) {
                        try (Cursor cursor = db.rawQuery("SELECT 1 FROM expenses WHERE category_id = ? LIMIT 1", new String[]{id})) { if (cursor.moveToFirst()) continue; }
                        if (id.startsWith("default-")) continue;
                    }
                    db.delete(store, "id = ?", new String[]{id});
                }
            }
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }
}
