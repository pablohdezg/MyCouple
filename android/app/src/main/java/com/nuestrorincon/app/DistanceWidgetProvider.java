package com.nuestrorincon.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Widget: distancia y dirección entre los dos (no es un mapa interactivo,
 * sólo el resumen en texto de "dónde estamos"). */
public class DistanceWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context));
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, DistanceWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(cn);
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    private static RemoteViews build(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_distance);

        views.setTextViewText(R.id.widget_avatar_me, prefs.getString("meEmoji", "💗"));
        views.setTextViewText(R.id.widget_avatar_other, prefs.getString("otherEmoji", "💙"));

        String distance = prefs.getString("distanceText", null);
        if (distance != null) {
            views.setTextViewText(R.id.widget_distance_text, distance);
            views.setTextViewText(
                    R.id.widget_distance_updated,
                    "Actualizado " + prefs.getString("distanceUpdated", ""));
        } else {
            views.setTextViewText(R.id.widget_distance_text, "Activad el mapa para ver la distancia");
            views.setTextViewText(R.id.widget_distance_updated, "");
        }

        views.setOnClickPendingIntent(R.id.widget_root, WidgetUtil.openApp(context));
        return views;
    }
}
