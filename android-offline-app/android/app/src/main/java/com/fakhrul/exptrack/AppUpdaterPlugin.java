package com.fakhrul.exptrack;

import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String REPO = "fakhrul62/expense-track";
    private static final long MAX_APK = 100L * 1024 * 1024;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean working = new AtomicBoolean(false);
    private final AtomicBoolean cancelled = new AtomicBoolean(false);
    private SharedPreferences prefs() { return getContext().getSharedPreferences("app_updates", 0); }
    private File directory() throws IOException { File path = new File(getContext().getCacheDir(), "updates"); if (!path.isDirectory() && !path.mkdirs()) throw new IOException("Device storage is unavailable."); return path; }
    private File apk() throws IOException { return new File(directory(), "pending.apk"); }
    private JSONObject spec() throws Exception { String value = prefs().getString("candidate", null); if (value == null) return null; JSONObject result = new JSONObject(value); UpdateVerifier.validateSpec(result); return result; }
    private PackageInfo installed() throws Exception { return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), UpdateVerifier.flags()); }
    private boolean allowed() { return Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls(); }
    private JSObject state() throws Exception {
        PackageInfo current = installed(); JSONObject candidate = spec();
        boolean available = candidate != null && candidate.getLong("code") > UpdateVerifier.code(current);
        JSObject result = new JSObject(); result.put("currentVersion", current.versionName); result.put("currentCode", UpdateVerifier.code(current)); result.put("available", available); result.put("canInstall", allowed()); result.put("busy", working.get());
        boolean ready = false;
        if (available && apk().isFile() && candidate.getString("sha256").equals(prefs().getString("downloadedHash", ""))) {
            try { UpdateVerifier.verify(getContext(), apk(), candidate); ready = true; } catch (Exception ignored) { prefs().edit().remove("downloadedHash").apply(); }
        }
        result.put("ready", ready);
        if (candidate != null) { result.put("latestVersion", candidate.getString("version")); result.put("latestCode", candidate.getLong("code")); }
        return result;
    }
    private HttpURLConnection connection(String address) throws Exception {
        URL url = new URL(address);
        for (int count = 0; count < 4; count++) {
            if (!"https".equals(url.getProtocol()) || !("api.github.com".equals(url.getHost()) || "raw.githubusercontent.com".equals(url.getHost()))) throw new IOException("Untrusted update source.");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(15000); connection.setReadTimeout(30000); connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("User-Agent", "EXPTRACK-Android-Updater"); connection.setRequestProperty("Accept", "application/vnd.github+json");
            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) { String next = connection.getHeaderField("Location"); connection.disconnect(); if (next == null) throw new IOException("Invalid update redirect."); url = new URL(url, next); continue; }
            if (status != 200) { connection.disconnect(); if (status == 404) throw new FileNotFoundException("The latest update files are not available yet. Try again later."); throw new IOException(status == 403 || status == 429 ? "GitHub is busy or its request limit was reached. Try again later." : status == 404 ? "The latest update files are not available yet. Try again later." : "GitHub could not be reached. Try again when connected."); }
            return connection;
        }
        throw new IOException("Too many update redirects.");
    }
    private String text(String address) throws Exception {
        HttpURLConnection connection = connection(address);
        try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] bytes = new byte[4096]; int count;
            while ((count = input.read(bytes)) != -1) { if (output.size() + count > 256000) throw new IOException("Update details are too large."); output.write(bytes, 0, count); }
            return output.toString(StandardCharsets.UTF_8.name());
        } finally { connection.disconnect(); }
    }
    private String raw(String commit, String path) { return "https://raw.githubusercontent.com/" + REPO + "/" + commit + "/android-offline-app/" + path; }
    private String match(String source, String expression) throws IOException { Matcher matcher = Pattern.compile(expression).matcher(source); if (!matcher.find()) throw new IOException("GitHub returned invalid version details."); return matcher.group(1); }
    @PluginMethod public void getState(PluginCall call) {
        worker.execute(() -> { try { call.resolve(state()); } catch (Exception error) { call.reject("Could not read update status. Please check for updates again."); } });
    }
    @PluginMethod public void check(PluginCall call) {
        if (!working.compareAndSet(false, true)) { call.reject("An update operation is already running."); return; }
        worker.execute(() -> {
            try {
                // A single CDN descriptor identifies the release. Versioned APK paths,
                // checksum and archive verification prevent mismatched files during pushes.
                JSONObject candidate;
                try {
                    candidate = new JSONObject(text(raw("main", "android-update.json")));
                    candidate.put("commit", "main");
                } catch (FileNotFoundException legacyRelease) {
                    String gradle = text(raw("main", "android/app/build.gradle"));
                    String version = match(gradle, "versionName\\s+\"([0-9]+\\.[0-9]+\\.[0-9]+)\"");
                    long code = Long.parseLong(match(gradle, "versionCode\\s+([0-9]+)"));
                    String filename = "EXPTRACK-" + version + ".apk";
                    String[] parts = text(raw("main", "dist/" + filename + ".sha256")).trim().split("\\s+");
                    if (parts.length != 2 || !parts[1].equals(filename)) throw new IOException("Invalid update checksum file.");
                    candidate = new JSONObject().put("commit", "main").put("version", version).put("code", code).put("sha256", parts[0].toLowerCase(java.util.Locale.ROOT));
                }
                UpdateVerifier.validateSpec(candidate);
                if (!prefs().edit().putString("candidate", candidate.toString()).commit()) throw new IOException("Could not save update details.");
                call.resolve(state());
            } catch (Exception error) { call.reject(error instanceof IOException ? error.getMessage() : "Could not check GitHub. Connect to the internet and try again."); }
            finally { working.set(false); }
        });
    }
    @PluginMethod public void cancelDownload(PluginCall call) { cancelled.set(true); call.resolve(); }
    @PluginMethod public void download(PluginCall call) {
        if (!working.compareAndSet(false, true)) { call.reject("An update operation is already running."); return; }
        cancelled.set(false);
        worker.execute(() -> {
            File partial = null;
            try {
                JSONObject candidate = spec();
                if (candidate == null || candidate.getLong("code") <= UpdateVerifier.code(installed())) throw new IOException("Check for a newer update first.");
                if (state().optBoolean("ready", false)) { call.resolve(state()); return; }
                partial = new File(directory(), "pending.apk.part");
                HttpURLConnection connection = connection(raw(candidate.getString("commit"), "dist/EXPTRACK-" + candidate.getString("version") + ".apk"));
                long expected = connection.getContentLengthLong(), received = 0, started = System.currentTimeMillis(); int previous = -1;
                if (expected > MAX_APK) { connection.disconnect(); throw new IOException("The update is too large."); }
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] bytes = new byte[32768]; int count;
                    while ((count = input.read(bytes)) != -1) {
                        if (cancelled.get()) throw new IOException("Download cancelled.");
                        received += count;
                        if (received > MAX_APK || System.currentTimeMillis() - started > 180000) throw new IOException("The download could not finish. Try again on a stable connection.");
                        output.write(bytes, 0, count);
                        int percent = expected > 0 ? (int)Math.min(100, received * 100 / expected) : 0;
                        if (percent != previous) { JSObject progress = new JSObject(); progress.put("percent", percent); progress.put("received", received); progress.put("total", expected); notifyListeners("downloadProgress", progress); previous = percent; }
                    }
                    output.getFD().sync();
                } finally { connection.disconnect(); }
                if (received == 0 || (expected > 0 && received != expected)) throw new IOException("The download is incomplete. Try again.");
                if (cancelled.get()) throw new IOException("Download cancelled.");
                UpdateVerifier.verify(getContext(), partial, candidate);
                if (apk().exists() && !apk().delete()) throw new IOException("Could not replace the previous download.");
                if (!partial.renameTo(apk())) throw new IOException("Could not save the downloaded APK.");
                prefs().edit().putString("downloadedHash", candidate.getString("sha256")).apply();
                call.resolve(state());
            } catch (Exception error) { call.reject(error.getMessage() == null ? "The download failed. Check your connection and try again." : error.getMessage()); }
            finally { if (partial != null && partial.exists()) partial.delete(); working.set(false); }
        });
    }
    @PluginMethod public void install(PluginCall call) {
        if (!working.compareAndSet(false, true)) { call.reject("An update operation is already running."); return; }
        worker.execute(() -> {
            try {
                JSONObject candidate = spec(); if (candidate == null) throw new IOException("Check for updates first.");
                UpdateVerifier.verify(getContext(), apk(), candidate);
                boolean permission = allowed();
                Uri content = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk());
                getActivity().runOnUiThread(() -> {
                    try {
                        if (!permission) getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName())));
                        else {
                            Intent installer = new Intent(Intent.ACTION_VIEW).setDataAndType(content, "application/vnd.android.package-archive");
                            installer.setClipData(ClipData.newRawUri("EXPTRACK update", content)); installer.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            getActivity().startActivity(installer);
                        }
                        JSObject result = new JSObject(); result.put("status", permission ? "installer" : "permission"); call.resolve(result);
                    } catch (Exception error) { call.reject("Android could not open the installer. Check installation permissions and try again."); }
                    finally { working.set(false); }
                });
            } catch (Exception error) { working.set(false); call.reject(error.getMessage() == null ? "Could not verify this update. Download it again." : error.getMessage()); }
        });
    }
    @Override protected void handleOnDestroy() { cancelled.set(true); worker.shutdown(); }
}
