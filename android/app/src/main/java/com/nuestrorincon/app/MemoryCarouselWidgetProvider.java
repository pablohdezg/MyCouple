package com.nuestrorincon.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.File;

/**
 * Widget: carrusel de fotos de "Recuerdos".
 *
 * Como un widget no puede animar solo, el carrusel avanza de dos formas:
 * cada vez que Android lo refresca por su cuenta (cada ~30 minutos, que es
 * el mínimo que permite el sistema) y al tocar la foto, que pasa a la
 * siguiente al momento. Un pequeño corazón en la esquina abre la app.
 */
public class MemoryCarouselWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_NEXT = "com.nuestrorincon.app.CAROUSEL_NEXT";
    private static final String PREF_INDEX = "carouselIndex";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_NEXT.equals(intent.getAction())) {
            advance(context);
            return;
        }
        super.onReceive(context, intent);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        // Refresco periódico del propio Android: aprovechamos para avanzar
        // una foto, así el carrusel se mueve solo con el tiempo.
        advance(context);
    }

    private void advance(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS, Context.MODE_PRIVATE);
        int count = Math.max(1, prefs.getInt("carouselCount", 0));
        int index = (prefs.getInt(PREF_INDEX, 0) + 1) % count;
        prefs.edit().putInt(PREF_INDEX, index).apply();
        pushUpdate(context);
    }

    /** Repinta con la foto actual, sin avanzar: para cuando la app manda
     * datos nuevos (puede haber fotos nuevas, pero seguimos en el mismo
     * punto del carrusel). */
    static void refreshAll(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS, Context.MODE_PRIVATE);
        int count = Math.max(1, prefs.getInt("carouselCount", 0));
        int index = prefs.getInt(PREF_INDEX, 0) % count;
        if (index != prefs.getInt(PREF_INDEX, 0)) {
            prefs.edit().putInt(PREF_INDEX, index).apply();
        }
        pushUpdate(context);
    }

    static File photoFile(Context ctx, int index) {
        return new File(ctx.getFilesDir(), "widget_carousel_" + index + ".jpg");
    }

    private static void pushUpdate(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, MemoryCarouselWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(cn);
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    private static RemoteViews build(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_carousel);

        int count = prefs.getInt("carouselCount", 0);
        if (count <= 0) {
            views.setTextViewText(R.id.widget_carousel_caption, "Añadid fotos en Recuerdos");
            views.setTextViewText(R.id.widget_carousel_counter, "");
            views.setOnClickPendingIntent(R.id.widget_carousel_root, WidgetUtil.openApp(context));
            return views;
        }

        int index = prefs.getInt(PREF_INDEX, 0) % count;
        String caption = "";
        String date = "";
        try {
            JSONObject meta = new JSONObject(prefs.getString("carouselMeta", "{}"));
            JSONObject entry = meta.optJSONObject(String.valueOf(index));
            if (entry != null) {
                caption = entry.optString("caption", "");
                date = entry.optString("date", "");
            }
        } catch (Exception e) {
            // Sin datos extra, se queda solo con la foto.
        }

        File file = photoFile(context, index);
        Bitmap bmp = BitmapFactory.decodeFile(file.getAbsolutePath());
        if (bmp != null) views.setImageViewBitmap(R.id.widget_carousel_image, bmp);

        views.setTextViewText(
                R.id.widget_carousel_caption,
                caption.isEmpty() ? "Recuerdo" : caption);
        views.setTextViewText(R.id.widget_carousel_date, date);
        views.setTextViewText(R.id.widget_carousel_counter, (index + 1) + "/" + count);

        Intent next = new Intent(context, MemoryCarouselWidgetProvider.class);
        next.setAction(ACTION_NEXT);
        views.setOnClickPendingIntent(R.id.widget_carousel_image, WidgetUtil.broadcast(context, next, 100));
        views.setOnClickPendingIntent(R.id.widget_carousel_open, WidgetUtil.openApp(context));
        return views;
    }
}
