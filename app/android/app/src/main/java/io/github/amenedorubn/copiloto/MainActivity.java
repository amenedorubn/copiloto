package io.github.amenedorubn.copiloto;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CopilotoPlugin.class); // voz, pantalla, GPS e informe (ver CopilotoPlugin)
        super.onCreate(savedInstanceState);
        WebView w = getBridge().getWebView();
        // con la pantalla apagada, que Android no trate a la web como prescindible
        if (Build.VERSION.SDK_INT >= 26) w.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                atras();
            }
        });
        recibeConexion(getIntent());
    }

    /**
     * El gesto de atras lo decide la web (window.atrasApp), como en Chrome: cierra la hoja,
     * vuelve a HOY o, con un entreno en marcha, no hace nada. Solo sale si ella lo dice.
     * Sin esto Android sacaba de la app a mitad de entreno y el GPS se paraba.
     */
    private void atras() {
        WebView w = getBridge() == null ? null : getBridge().getWebView();
        if (w == null) {
            moveTaskToBack(true);
            return;
        }
        w.evaluateJavascript("(function(){try{return window.atrasApp?window.atrasApp():'vieja'}catch(e){return 'salir'}})()", v -> {
            if ("\"vieja\"".equals(v)) { // una web de antes, sin atrasApp: su historial
                if (w.canGoBack()) w.goBack();
                else moveTaskToBack(true);
            } else if (!"\"ok\"".equals(v)) {
                moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        recibeConexion(intent);
    }

    /**
     * copiloto://config?url=..&key=.. (lo manda la web desde Ajustes): se abre la app con
     * #url=..&key=.., que es lo que ya lee al arrancar (como el QR), y lo guarda.
     */
    private void recibeConexion(Intent intent) {
        Uri u = intent == null ? null : intent.getData();
        if (u == null || !"copiloto".equals(u.getScheme()) || !"config".equals(u.getHost())) return;
        String q = u.getEncodedQuery();
        if (q == null || !q.contains("key=")) return;
        setIntent(new Intent(intent).setData(null)); // que no se repita al girar o volver
        String base = getBridge().getAppUrl();
        if (!base.endsWith("/")) base += "/";
        getBridge().getWebView().loadUrl(base + "#" + q);
    }
}
