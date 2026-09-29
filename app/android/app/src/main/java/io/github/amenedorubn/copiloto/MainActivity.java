package io.github.amenedorubn.copiloto;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CopilotoPlugin.class); // voz y pantalla encendida (ver CopilotoPlugin)
        super.onCreate(savedInstanceState);
        recibeConexion(getIntent());
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
