package com.fakhrul.exptrack;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import org.json.JSONObject;
import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;

final class UpdateVerifier {
    static long code(PackageInfo info) { return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode; }
    static int flags() { return Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES; }
    static String hex(byte[] bytes) { StringBuilder result = new StringBuilder(); for (byte b : bytes) result.append(String.format(java.util.Locale.ROOT, "%02x", b & 255)); return result.toString(); }
    static String hash(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) { byte[] bytes = new byte[32768]; int count; while ((count = input.read(bytes)) != -1) digest.update(bytes, 0, count); }
        return hex(digest.digest());
    }
    static Set<String> signers(PackageInfo info) throws Exception {
        Signature[] signatures = Build.VERSION.SDK_INT >= 28 && info.signingInfo != null ? info.signingInfo.getApkContentsSigners() : info.signatures;
        Set<String> result = new HashSet<>();
        if (signatures != null) for (Signature signature : signatures) result.add(hex(MessageDigest.getInstance("SHA-256").digest(signature.toByteArray())));
        return result;
    }
    static void validateSpec(JSONObject spec) throws Exception {
        if (!(spec.getString("commit").equals("main") || spec.getString("commit").matches("[a-f0-9]{40}")) || !spec.getString("version").matches("[0-9]+\\.[0-9]+\\.[0-9]+(?:-debug)?") || spec.getLong("code") < 1 || spec.getLong("code") > Integer.MAX_VALUE || !spec.getString("sha256").matches("[a-f0-9]{64}")) throw new IllegalArgumentException("GitHub returned invalid update details. Try checking again.");
    }
    static void verify(Context context, File apk, JSONObject spec) throws Exception {
        validateSpec(spec);
        if (!apk.isFile() || !hash(apk).equals(spec.getString("sha256"))) throw new IllegalArgumentException("The download could not be verified. Download it again.");
        PackageManager pm = context.getPackageManager();
        PackageInfo installed = pm.getPackageInfo(context.getPackageName(), flags());
        PackageInfo candidate = pm.getPackageArchiveInfo(apk.getAbsolutePath(), flags());
        if (candidate == null || !context.getPackageName().equals(candidate.packageName)) throw new IllegalArgumentException("This APK is not an update for this app.");
        if (code(candidate) != spec.getLong("code") || !spec.getString("version").equals(candidate.versionName) || code(candidate) <= code(installed)) throw new IllegalArgumentException("This APK is not a newer matching version. Check for updates again.");
        Set<String> trusted = signers(installed), downloaded = signers(candidate);
        if (trusted.isEmpty() || !trusted.equals(downloaded)) throw new IllegalArgumentException("The APK signing certificate does not match EXPTRACK. The update was blocked.");
    }
}
