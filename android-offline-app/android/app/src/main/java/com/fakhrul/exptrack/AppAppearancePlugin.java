package com.fakhrul.exptrack;

import android.graphics.Color;
import android.content.res.Configuration;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppAppearance")
public class AppAppearancePlugin extends Plugin {
    private void applySaved() {
        getActivity().runOnUiThread(()->{
            android.content.SharedPreferences prefs=getContext().getSharedPreferences("app_appearance",0);
            int color=Color.parseColor(prefs.getString("color","#f3f5f9"));
            boolean dark=prefs.getBoolean("dark",false);
            android.view.Window window=getActivity().getWindow();
            window.getDecorView().setBackgroundColor(color);
            getBridge().getWebView().setBackgroundColor(color);
            window.setStatusBarColor(color);window.setNavigationBarColor(color);
            WindowInsetsControllerCompat bars=WindowCompat.getInsetsController(window,window.getDecorView());
            bars.setAppearanceLightStatusBars(!dark);bars.setAppearanceLightNavigationBars(!dark);
        });
    }
    @Override public void load(){getActivity().getWindow().getDecorView().post(this::applySaved);}
    @Override protected void handleOnResume(){getActivity().getWindow().getDecorView().post(this::applySaved);}
    @Override protected void handleOnConfigurationChanged(Configuration config){getActivity().getWindow().getDecorView().post(this::applySaved);}
    @PluginMethod public void apply(PluginCall call){
        String color=call.getString("color");
        if(color==null || !color.matches("#[a-fA-F0-9]{6}")){call.reject("Invalid appearance color.");return;}
        getContext().getSharedPreferences("app_appearance",0).edit().putString("color",color).putBoolean("dark",Boolean.TRUE.equals(call.getBoolean("dark",false))).apply();
        getActivity().runOnUiThread(()->{applySaved();call.resolve();});
    }
}
