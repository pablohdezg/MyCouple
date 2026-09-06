package com.nuestrorincon.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio para compartir la ubicación en segundo plano.
        registerPlugin(LocationSharingPlugin.class);
        // Puente con los widgets de la pantalla de inicio.
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
