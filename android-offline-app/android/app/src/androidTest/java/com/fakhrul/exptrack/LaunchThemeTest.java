package com.fakhrul.exptrack;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.ComponentName;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.util.TypedValue;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class LaunchThemeTest {
    @Test public void platformSplashMatchesSystemThemeWithoutAnOpaqueLogoTile() throws Exception {
        Context app = InstrumentationRegistry.getInstrumentation().getTargetContext();
        int themeId = app.getPackageManager().getActivityInfo(new ComponentName(app.getPackageName(), MainActivity.class.getName()), 0).getThemeResource();
        assertEquals(themeId, app.getApplicationInfo().theme);
        for (boolean night : new boolean[]{false, true}) {
            Configuration config = new Configuration(app.getResources().getConfiguration());
            config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK) | (night ? Configuration.UI_MODE_NIGHT_YES : Configuration.UI_MODE_NIGHT_NO);
            Context configured = app.createConfigurationContext(config);
            Resources.Theme theme = configured.getResources().newTheme();
            theme.applyStyle(themeId, true);
            TypedValue value = new TypedValue();
            if (Build.VERSION.SDK_INT >= 31) {
                assertTrue(theme.resolveAttribute(android.R.attr.windowSplashScreenBackground, value, true));
                assertEquals(night ? Color.rgb(21,23,25) : Color.rgb(251,247,238), value.data);
                assertTrue(theme.resolveAttribute(android.R.attr.windowSplashScreenIconBackgroundColor, value, true));
                assertEquals(Color.TRANSPARENT, value.data);
                assertTrue(theme.resolveAttribute(android.R.attr.windowSplashScreenAnimatedIcon, value, true));
                Drawable logo = configured.getResources().getDrawable(value.resourceId, theme);
                Bitmap bitmap = Bitmap.createBitmap(108,108,Bitmap.Config.ARGB_8888);
                logo.setBounds(0,0,108,108);
                logo.draw(new Canvas(bitmap));
                assertEquals("Logo corners must remain transparent in both themes", 0, Color.alpha(bitmap.getPixel(1,1)));
                assertTrue("Logo must still contain visible artwork", Color.alpha(bitmap.getPixel(54,54)) > 0);
                bitmap.recycle();
            }
        }
        if (Build.VERSION.SDK_INT >= 26) assertTrue(app.getPackageManager().getApplicationIcon(app.getPackageName()) instanceof AdaptiveIconDrawable);
    }
}
