package com.fakhrul.exptrack;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import com.getcapacitor.BridgeWebViewClient;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ExpenseStorePlugin.class);
        super.onCreate(savedInstanceState);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if ("localhost".equals(request.getUrl().getHost()) && path != null) {
                    String asset = null;
                    boolean html = path.matches("/(settings|login|register)/?");
                    if (html) asset = "public/" + path.replaceAll("^/|/$", "") + "/index.html";
                    else if (path.endsWith(".__PAGE__.txt")) asset = "public" + path.replace(".__PAGE__.txt", "/__PAGE__.txt");
                    if (asset != null) {
                        try {
                            InputStream stream = getAssets().open(asset);
                            if (html) stream = bridge.getLocalServer().getJavaScriptInjectedStream(stream);
                            return new WebResourceResponse(html ? "text/html" : "text/plain", "UTF-8", stream);
                        } catch (java.io.IOException ignored) { /* Let Capacitor handle missing routes. */ }
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
    }
}
