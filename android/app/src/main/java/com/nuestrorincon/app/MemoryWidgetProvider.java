package com.nuestrorincon.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;

import java.io.File;

/** Widget: el recuerdo más reciente del álbum, con su frase. */
public class MemoryWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context));
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, MemoryWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(cn);
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    private static RemoteViews build(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridgePlugin.PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_memory);

        String caption = prefs.getString("memoryCaption", null);
        views.setTextViewText(
                R.id.widget_memory_caption,
                caption != null && !caption.isEmpty() ? caption : "Vuestro álbum está vacío");
        views.setTextViewText(R.id.widget_memory_date, prefs.getString("memoryDate", ""));

        if (prefs.getBoolean("hasMemoryImage", false)) {
            File file = new File(context.getFilesDir(), WidgetBridgePlugin.MEMORY_FILE);
            Bitmap bmp = BitmapFactory.decodeFile(file.getAbsolutePath());
            if (bmp != null) {
                views.setImageViewBitmap(R.id.widget_memory_image, bmp);
            }
        }

        views.setOnClickPendingIntent(R.id.widget_root, WidgetUtil.openApp(context));
        return views;
    }
}
