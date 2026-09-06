package com.nuestrorincon.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Vuelve a levantar el reparto de ubicación cuando hace falta:
 *
 * - Al encender el móvil (antes había que abrir la app a mano después de
 *   cada reinicio, y hasta entonces no se compartía nada).
 * - Al actualizar la app.
 * - Cuando el propio servicio programa un reintento porque el sistema o el
 *   fabricante se lo ha llevado por delante.
 *
 * Sólo hace algo si el reparto estaba activado: si lo apagasteis, esto no
 * lo vuelve a encender por su cuenta.
 */
public class RestartReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!LiveLocation.isEnabled(context)) return;
        if (LocationSharingService.isRunning()) return;
        LocationSharingService.start(context);
    }
}
