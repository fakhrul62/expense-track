package com.fakhrul.exptrack;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.pm.PackageInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.nio.file.Files;

@RunWith(AndroidJUnit4.class)
public class AppUpdateTest {
    @Test public void verifiesTrustedUpgradeAndRejectsUnsafePackagesThenStagesInstallerFixture() throws Exception {
        Context app = InstrumentationRegistry.getInstrumentation().getTargetContext();
        File fixture = new File(app.getFilesDir(), "update-fixtures/candidate.apk");
        PackageInfo info = app.getPackageManager().getPackageArchiveInfo(fixture.getAbsolutePath(), UpdateVerifier.flags());
        assertNotNull(info);
        JSONObject spec = new JSONObject().put("commit", "0000000000000000000000000000000000000000").put("version", info.versionName).put("code", UpdateVerifier.code(info)).put("sha256", UpdateVerifier.hash(fixture));
        UpdateVerifier.verify(app, fixture, spec);
        JSONObject brokenHash = new JSONObject(spec.toString()).put("sha256", "0".repeat(64));
        try { UpdateVerifier.verify(app, fixture, brokenHash); fail("Checksum mismatch accepted"); } catch (IllegalArgumentException expected) { assertTrue(expected.getMessage().contains("verified")); }
        JSONObject wrongVersion = new JSONObject(spec.toString()).put("code", UpdateVerifier.code(info) + 1);
        try { UpdateVerifier.verify(app, fixture, wrongVersion); fail("Wrong version accepted"); } catch (IllegalArgumentException expected) { assertTrue(expected.getMessage().contains("version")); }
        File other = new File(app.getFilesDir(), "update-fixtures/wrong-package.apk");
        PackageInfo otherInfo = app.getPackageManager().getPackageArchiveInfo(other.getAbsolutePath(), UpdateVerifier.flags());
        JSONObject otherSpec = new JSONObject(spec.toString()).put("sha256", UpdateVerifier.hash(other)).put("version", otherInfo.versionName).put("code", UpdateVerifier.code(otherInfo));
        try { UpdateVerifier.verify(app, other, otherSpec); fail("Wrong package accepted"); } catch (IllegalArgumentException expected) { assertTrue(expected.getMessage().contains("not an update")); }
        File untrusted = new File(app.getFilesDir(), "update-fixtures/wrong-signer.apk");
        JSONObject untrustedSpec = new JSONObject(spec.toString()).put("sha256", UpdateVerifier.hash(untrusted));
        try { UpdateVerifier.verify(app, untrusted, untrustedSpec); fail("Wrong signer accepted"); } catch (IllegalArgumentException expected) { assertTrue(expected.getMessage().contains("certificate")); }
        JSONObject invalid = new JSONObject(spec.toString()).put("commit", "../../other");
        try { UpdateVerifier.validateSpec(invalid); fail("Unsafe revision accepted"); } catch (IllegalArgumentException expected) { }
        File directory = new File(app.getCacheDir(), "updates"); directory.mkdirs();
        Files.copy(fixture.toPath(), new File(directory, "pending.apk").toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        assertTrue(app.getSharedPreferences("app_updates", 0).edit().putString("candidate", spec.toString()).putString("downloadedHash", spec.getString("sha256")).commit());
    }
}
