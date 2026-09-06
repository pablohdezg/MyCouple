package com.nuestrorincon.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

/**
 * Vigila a la otra persona mientras el servicio está vivo: si entra o sale
 * de uno de vuestros lugares guardados, o si se está quedando sin batería,
 * avisa con una notificación.
 *
 * Lo hace el móvil que recibe, no el que se mueve: cada uno consulta de vez
 * en cuando dónde está el otro. Así funciona aunque la app del otro esté
 * cerrada del todo, que es justo la gracia.
 */
final class PartnerWatch {

    static final String CHANNEL_ID = "avisos_pareja";

    private static final String K_LAST_PLACE = "otherLastPlace";
    private static final String K_LAST_BATTERY_WARN = "otherBatteryWarnAt";
    private static final int NOTIF_PLACE = 4101;
    private static final int NOTIF_BATTERY = 4102;

    /** Por debajo de esto avisamos de que se queda sin batería. */
    private static final int BATTERY_LOW = 15;
    /** Y no repetimos el aviso hasta pasadas seis horas. */
    private static final long BATTERY_WARN_GAP = 6 * 60 * 60 * 1000L;

    private PartnerWatch() {}

    /** Compara la posición recién consultada con lo último que sabíamos. */
    static void check(Context ctx, JSONObject row) {
        if (row == null) return;
        SharedPreferences prefs = LiveLocation.prefs(ctx);
        String name = LiveLocation.otherName(ctx);

        try {
            double lat = row.getDouble("lat");
            double lon = row.getDouble("lon");
            String place = LiveLocation.placeAt(ctx, lat, lon);
            String before = prefs.getString(K_LAST_PLACE, null);

            // Sólo avisamos de los cambios, no de que siga donde estaba.
            boolean first = !prefs.contains(K_LAST_PLACE);
            if (!first && !equal(place, before)) {
                if (place != null) {
                    notify(ctx, NOTIF_PLACE, name + " ha llegado", "Está en " + place);
                } else if (before != null) {
                    notify(ctx, NOTIF_PLACE, name + " ha salido", "Ya no está en " + before);
                }
            }
            prefs.edit().putString(K_LAST_PLACE, place).apply();

            if (row.has("battery") && !row.isNull("battery")) {
                int battery = row.getInt("battery");
                long lastWarn = prefs.getLong(K_LAST_BATTERY_WARN, 0);
                if (battery > 0 && battery <= BATTERY_LOW
                        && System.currentTimeMillis() - lastWarn > BATTERY_WARN_GAP) {
                    notify(ctx, NOTIF_BATTERY,
                            name + " se queda sin batería",
                            "Le queda un " + battery + "%. Igual tarda en contestar.");
                    prefs.edit().putLong(K_LAST_BATTERY_WARN, System.currentTimeMillis()).apply();
                }
            }
        } catch (Exception ignored) {
        }
    }

    private static boolean equal(String a, String b) {
        return a == null ? b == null : a.equals(b);
    }

    private static void notify(Context ctx, int id, String title, String text) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Avisos de tu pareja", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Cuando llega o sale de vuestros lugares, o se queda sin batería");
            nm.createNotificationChannel(channel);
        }

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getActivity(ctx, id, open, flags);

        Notification n = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_stat_icon)
                .setContentIntent(pending)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build();
        nm.notify(id, n);
    }
}
