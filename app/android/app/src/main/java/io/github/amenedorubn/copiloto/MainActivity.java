package io.github.amenedorubn.copiloto;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CopilotoPlugin.class); // voz y pantalla encendida (ver CopilotoPlugin)
        super.onCreate(savedInstanceState);
    }
}
