package com.fakhrul.exptrack;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Private, versioned SQLite storage. Disk work never runs on the UI thread. */
@CapacitorPlugin(name = "ExpenseStore")
public class ExpenseStorePlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private Database helper;
    @Override public void load() { helper = new Database(getContext()); }

    private static class Database extends SQLiteOpenHelper {
        Database(Context context) { this(context, "exptrack.db"); }
        Database(Context context, String filename) { super(context, filename, null, 1); setWriteAheadLoggingEnabled(true); }
        @Override public void onConfigure(SQLiteDatabase db) { db.setForeignKeyConstraintsEnabled(true); }
        @Override public void onCreate(SQLiteDatabase db) {
            db.execSQL("CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, icon TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
            db.execSQL("CREATE TABLE expenses (id TEXT PRIMARY KEY, amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT, note TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
            db.execSQL("CREATE INDEX expenses_date ON expenses(date DESC, created_at DESC)");
            db.execSQL("CREATE INDEX expenses_category ON expenses(category_id)");
        }
        @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            // Add explicit, non-destructive migrations when the schema changes.
            throw new IllegalStateException("Unsupported database migration");
        }
    }

    @PluginMethod public void setUser(PluginCall call) {
        worker.execute(() -> {
            try {
                String id = call.getString("id");
                if (id == null || !id.matches("[a-f0-9]{24}")) throw new IllegalArgumentException("Invalid account");
                android.content.SharedPreferences prefs = getContext().getSharedPreferences("exptrack_accounts", Context.MODE_PRIVATE);
                String owner = prefs.getString("legacy_owner", null);
                if (owner == null) {
                    if (!prefs.edit().putString("legacy_owner", id).commit()) throw new IllegalStateException("Storage unavailable");
                    owner = id;
                }
                helper.close();
                helper = new Database(getContext(), id.equals(owner) ? "exptrack.db" : "exptrack_" + id + ".db");
                helper.getWritableDatabase();
                call.resolve();
            } catch (Exception error) { call.reject("Could not open account storage", error); }
        });
    }

    private javax.crypto.SecretKey sessionKey() throws Exception {
        java.security.KeyStore store = java.security.KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (!store.containsAlias("exptrack_session")) {
            javax.crypto.KeyGenerator generator = javax.crypto.KeyGenerator.getInstance("AES", "AndroidKeyStore");
            generator.init(new android.security.keystore.KeyGenParameterSpec.Builder("exptrack_session", android.security.keystore.KeyProperties.PURPOSE_ENCRYPT | android.security.keystore.KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (javax.crypto.SecretKey) store.getKey("exptrack_session", null);
    }
    @PluginMethod public void writeSession(PluginCall call) {
        worker.execute(() -> {
            try {
                android.content.SharedPreferences prefs = getContext().getSharedPreferences("exptrack_session", Context.MODE_PRIVATE);
                String value = call.getString("value");
                android.content.SharedPreferences.Editor editor = prefs.edit().clear();
                if (value != null) {
                    javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
                    cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, sessionKey());
                    editor.putString("iv", android.util.Base64.encodeToString(cipher.getIV(), android.util.Base64.NO_WRAP));
                    editor.putString("data", android.util.Base64.encodeToString(cipher.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)), android.util.Base64.NO_WRAP));
                }
                if (!editor.commit()) throw new IllegalStateException("Storage unavailable");
                call.resolve();
            } catch (Exception error) { call.reject("Could not save account session", error); }
        });
    }
    @PluginMethod public void readSession(PluginCall call) {
        worker.execute(() -> {
            try {
                android.content.SharedPreferences prefs = getContext().getSharedPreferences("exptrack_session", Context.MODE_PRIVATE);
                String data = prefs.getString("data", null);
                JSObject result = new JSObject();
                if (data != null) {
                    byte[] iv = android.util.Base64.decode(prefs.getString("iv", ""), android.util.Base64.NO_WRAP);
                    javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
                    cipher.init(javax.crypto.Cipher.DECRYPT_MODE, sessionKey(), new javax.crypto.spec.GCMParameterSpec(128, iv));
                    result.put("value", new String(cipher.doFinal(android.util.Base64.decode(data, android.util.Base64.NO_WRAP)), java.nio.charset.StandardCharsets.UTF_8));
                }
                call.resolve(result);
            } catch (Exception error) {
                getContext().getSharedPreferences("exptrack_session", Context.MODE_PRIVATE).edit().clear().commit();
                call.resolve(new JSObject());
            }
        });
    }

    private String table(PluginCall call) {
        String store = call.getString("store");
        if (!"categories".equals(store) && !"expenses".equals(store)) throw new IllegalArgumentException("Unknown collection");
        return store;
    }

    @PluginMethod public void list(PluginCall call) {
        worker.execute(() -> {
            try {
                String table = table(call);
                String month = call.getString("month");
                boolean filtered = "expenses".equals(table) && month != null;
                if (filtered && !month.matches("\\d{4}-\\d{2}")) throw new IllegalArgumentException("Invalid month");
                JSArray records = new JSArray();
                try (Cursor cursor = helper.getReadableDatabase().query(table, null,
                        filtered ? "date >= ? AND date <= ?" : null,
                        filtered ? new String[]{month + "-01", month + "-31"} : null,
                        null, null, null)) {
                    while (cursor.moveToNext()) {
                        JSObject record = new JSObject();
                        record.put("_id", string(cursor, "id"));
                        record.put("createdAt", string(cursor, "created_at"));
                        record.put("updatedAt", string(cursor, "updated_at"));
                        if ("categories".equals(table)) {
                            record.put("name", string(cursor, "name"));
                            record.put("icon", string(cursor, "icon"));
                            record.put("isDefault", cursor.getInt(cursor.getColumnIndexOrThrow("is_default")) == 1);
                        } else {
                            record.put("amount", cursor.getLong(cursor.getColumnIndexOrThrow("amount_cents")) / 100.0);
                            record.put("categoryId", string(cursor, "category_id"));
                            record.put("note", string(cursor, "note"));
                            record.put("date", string(cursor, "date"));
                        }
                        records.put(record);
                    }
                }
                JSObject result = new JSObject(); result.put("records", records); call.resolve(result);
            } catch (Exception error) { call.reject("Could not read expenses on this device.", error); }
        });
    }
    private static String string(Cursor cursor, String name) { return cursor.getString(cursor.getColumnIndexOrThrow(name)); }

    @PluginMethod public void put(PluginCall call) {
        worker.execute(() -> {
            try {
                String table = table(call);
                JSONObject record = call.getObject("record");
                if (record == null) throw new IllegalArgumentException("Missing record");
                String id = record.getString("_id");
                ContentValues values = new ContentValues();
                values.put("id", id);
                values.put("updated_at", record.getString("updatedAt"));
                if ("categories".equals(table)) {
                    values.put("name", record.getString("name"));
                    values.put("icon", record.getString("icon"));
                    values.put("is_default", record.getBoolean("isDefault") ? 1 : 0);
                } else {
                    values.put("amount_cents", Math.round(record.getDouble("amount") * 100));
                    values.put("category_id", record.getString("categoryId"));
                    values.put("note", record.optString("note", ""));
                    values.put("date", record.getString("date"));
                }
                SQLiteDatabase db = helper.getWritableDatabase();
                db.beginTransaction();
                try {
                    if (db.update(table, values, "id = ?", new String[]{id}) == 0) {
                        values.put("created_at", record.getString("createdAt"));
                        db.insertOrThrow(table, null, values);
                    }
                    db.setTransactionSuccessful();
                } finally { db.endTransaction(); }
                call.resolve();
            } catch (Exception error) { call.reject("Could not save. Check that the category exists and has a unique name, and that your device has free storage.", error); }
        });
    }

    @PluginMethod public void remove(PluginCall call) {
        worker.execute(() -> {
            try {
                String table = table(call);
                String id = call.getString("id");
                if (id == null) throw new IllegalArgumentException("Missing id");
                SQLiteDatabase db = helper.getWritableDatabase();
                db.beginTransaction();
                try {
                    if ("categories".equals(table)) {
                        try (Cursor cursor = db.rawQuery("SELECT is_default FROM categories WHERE id = ?", new String[]{id})) {
                            if (cursor.moveToFirst() && cursor.getInt(0) == 1) throw new IllegalArgumentException("Default categories cannot be deleted.");
                        }
                        try (Cursor cursor = db.rawQuery("SELECT 1 FROM expenses WHERE category_id = ? LIMIT 1", new String[]{id})) {
                            if (cursor.moveToFirst()) throw new IllegalArgumentException("This category has expenses. Reassign or remove them first.");
                        }
                    }
                    db.delete(table, "id = ?", new String[]{id});
                    db.setTransactionSuccessful();
                } finally { db.endTransaction(); }
                call.resolve();
            } catch (IllegalArgumentException error) { call.reject(error.getMessage(), error); }
              catch (Exception error) { call.reject("Could not delete. Your expenses have not been changed.", error); }
        });
    }
    @Override protected void handleOnDestroy() { worker.execute(() -> helper.close()); worker.shutdown(); }
}
